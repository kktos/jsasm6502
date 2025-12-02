import { EventEmitter } from "node:events";
import type { CPUHandler } from "./cpu/cpuhandler.class";
import { DirectiveHandler } from "./directives/handler";
import { MacroHandler } from "./directives/macro/handler";
import type { MacroDefinition } from "./directives/macro/macro.interface";
import { ExpressionEvaluator } from "./expression";
import { AssemblyLexer, type OperatorStackToken, type ScalarToken, type Token } from "./lexer/lexer.class";
import { Linker, type Segment } from "./linker.class";
import { Logger } from "./logger";
import { Parser } from "./parser.class";
import type { AssemblerOptions, DataProcessor, FileHandler } from "./polyasm.types";
import { PASymbolTable } from "./symbol.class";
import { getHex } from "./utils/hex.util";

const DEFAULT_PC = 0x1000;

export class Assembler {
	public lexer: AssemblyLexer;
	private cpuHandler: CPUHandler;
	public symbolTable: PASymbolTable;
	public fileHandler: FileHandler;
	public currentPC: number;

	/** Linker responsible for segments and final linking. */
	public linker: Linker;
	public isAssembling = true;

	private lastGlobalLabel: string | null = null;
	public anonymousLabels: number[] = [];

	public macroDefinitions: Map<string, MacroDefinition> = new Map();
	public options: Map<string, string> = new Map();

	public logger: Logger;
	public parser: Parser;

	public pass: number;

	public expressionEvaluator: ExpressionEvaluator;
	public directiveHandler: DirectiveHandler;
	public macroHandler: MacroHandler;
	private rawDataProcessors?: Map<string, DataProcessor>;
	public emitter: EventEmitter;

	constructor(handler: CPUHandler, fileHandler: FileHandler, options?: AssemblerOptions) {
		this.cpuHandler = handler;
		this.fileHandler = fileHandler;
		this.logger = options?.logger ?? new Logger();
		this.linker = new Linker();
		this.rawDataProcessors = options?.rawDataProcessors;
		this.currentPC = DEFAULT_PC;
		this.symbolTable = new PASymbolTable();
		this.symbolTable.addSymbol("*", this.currentPC);

		this.expressionEvaluator = new ExpressionEvaluator(this, this.logger);
		this.directiveHandler = new DirectiveHandler(this, this.logger);
		this.macroHandler = new MacroHandler(this, this.logger);
		this.lexer = new AssemblyLexer();
		this.emitter = new EventEmitter();
		this.parser = new Parser(this.lexer, this.emitter);

		this.pass = -1;

		if (options?.segments) {
			for (const seg of options.segments) this.linker.addSegment(seg.name, seg.start, seg.size, seg.padValue, seg.resizable);
			this.linker.useSegment(options.segments[0].name);
		}
	}
	/** Convenience: add a segment via the embedded linker. */
	public addSegment(name: string, start: number, size: number, padValue = 0, resizable = false): void {
		this.linker.addSegment(name, start, size, padValue, resizable);
	}

	/** Convenience: link segments via the linker. */
	public link(segments?: Segment[]): number[] {
		return this.linker.link(segments);
	}

	/** Select the active segment for subsequent writes. */
	public useSegment(name: string): void {
		this.currentPC = this.linker.useSegment(name);
	}

	/** Write an array of bytes at the current PC via the linker and advance PC. */
	public writeBytes(bytes: number[]): void {
		this.linker.writeBytes(this.currentPC, bytes);
		this.currentPC += bytes.length;
	}

	public getDataProcessor(name: string) {
		return this.rawDataProcessors?.get(name);
	}

	public assemble(source: string): Segment[] {
		// Pre-scan for lexer-affecting options
		const optionMatch = /^\s*\.OPTION\s+local_label_style\s+"(.)"/im.exec(source);
		const localLabelStyle = optionMatch ? optionMatch[1] : ":";

		// Initialize or re-initialize the lexer with the found option.
		this.lexer = new AssemblyLexer({ localLabelStyle });
		this.parser.lexer = this.lexer;
		this.parser.start(source);

		// Set assembler options from the pre-scan so they are available in Pass 1
		if (localLabelStyle) this.options.set("local_label_style", localLabelStyle);

		this.passOne();

		// Ensure we start Pass 2 in the GLOBAL namespace (reset any .NAMESPACE from Pass 1)
		this.symbolTable.setNamespace("global");

		// this.currentPC = (this.symbolTable.lookupSymbol("*") as number) || 0x0000;
		// Ensure there's at least one segment: if none defined, create a default growable segment starting at 0
		if (!this.linker.segments || this.linker.segments.length === 0) {
			this.linker.addSegment("CODE", 0x1000, 0xefff);
			this.linker.useSegment("CODE");
		}

		// Reset stream stack for Pass 2 (fresh position)
		this.parser.restart();

		this.passTwo();

		this.logger.log(`\n--- Assembly Complete (${this.cpuHandler.cpuType}) ---`);
		this.logger.log(`Final PC location: $${getHex(this.currentPC)}`);

		// All emitted bytes are stored in the linker segments (a default segment was created if none existed).
		return this.linker.segments;
	}

	public getLastGlobalLabel(): string | null {
		return this.lastGlobalLabel;
	}

	private passOne(): void {
		this.logger.log(`\n--- Starting Pass 1: PASymbol Definition & PC Calculation (${this.cpuHandler.cpuType}) ---`);

		this.pass = 1;
		this.parser.setPosition(0);
		this.anonymousLabels = [];
		this.lastGlobalLabel = null;

		if (this.linker.segments.length) this.currentPC = this.linker.segments.length ? this.linker.segments[0].start : DEFAULT_PC;

		while (this.parser.tokenStreamStack.length > 0) {
			const token = this.parser.nextToken();
			// If no token or EOF, pop the active stream
			if (!token || token.type === "EOF") {
				const poppedStream = this.parser.popTokenStream(false); // Don't emit event yet
				if (this.parser.tokenStreamStack.length === 0) break;
				if (poppedStream) {
					this.emitter.emit(`endOfStream:${poppedStream.id}`);
					// if (this.symbolTable.getCurrentNamespace().startsWith("__MACRO_")) this.symbolTable.popScope();
				}
				continue;
			}

			switch (token.type) {
				case "DOT": {
					const directiveToken = this.parser.nextToken() as ScalarToken;
					if (directiveToken?.type !== "IDENTIFIER") throw new Error(`Syntax error in line ${token.line}`);

					const directiveContext = {
						pc: this.currentPC,
						allowForwardRef: true,
						currentGlobalLabel: this.lastGlobalLabel,
						options: this.options,
						macroArgs: this.parser.tokenStreamStack[this.parser.tokenStreamStack.length - 1].macroArgs,
					};

					this.directiveHandler.handlePassOneDirective(directiveToken, directiveContext);
					break;
				}

				case "OPERATOR": {
					if (token.value === "*") {
						this.lastGlobalLabel = "*";
						break;
					}

					if (token.value === "=" && this.lastGlobalLabel) {
						this.handleSymbolInPassOne(token, this.lastGlobalLabel);
						break;
					}
					throw new Error(`Syntax error in line ${token.line}`);
				}

				case "IDENTIFIER": {
					// PRIORITY 1: MACRO
					if (this.macroHandler.isMacro(token.value)) {
						// this.setPosition(this.skipToEndOfLine(this.getPosition()));
						this.macroHandler.expandMacro(token);
						break;
					}

					// PRIORITY 2: CPU INSTRUCTION OR ...
					// A mnemonic must be a string. If it's an array, it's an error.
					// if (typeof token.value !== "string") throw new Error("Invalid instruction: Mnemonic cannot be an array.");

					// Check if the mnemonic is a known instruction for the current CPU.
					if (this.cpuHandler.isInstruction(token.value)) {
						this.handleInstructionPassOne(token as ScalarToken);
						break;
					}

					// PRIORITY 3: ... OR LABEL
					// It's not a known instruction, so treat it as a label definition.
					this.lastGlobalLabel = token.value;
					break;
				}
				case "LABEL": {
					this.lastGlobalLabel = token.value;
					this.symbolTable.addSymbol(token.value, this.currentPC);
					this.logger.log(`Defined label ${token.value} @ $${getHex(this.currentPC)}`);
					break;
				}

				case "LOCAL_LABEL": {
					if (!this.lastGlobalLabel) throw `ERROR on line ${token.line}: Local label ':${token.value}' defined without a preceding global label.`;

					const qualifiedName = `${this.lastGlobalLabel}.${token.value}`;
					this.symbolTable.addSymbol(qualifiedName, this.currentPC);
					break;
				}

				case "ANONYMOUS_LABEL_DEF": {
					this.anonymousLabels.push(this.currentPC);
					break;
				}
			}
		}
	}

	private passTwo(): void {
		this.logger.log(`\n--- Starting Pass 2: Code Generation (${this.cpuHandler.cpuType}) ---`);
		this.pass = 2;
		if (this.linker.segments.length) this.currentPC = this.linker.segments.length ? this.linker.segments[0].start : DEFAULT_PC;

		// this.symbolTable.setSymbol("*", this.currentPC);
		this.anonymousLabels = [];
		this.lastGlobalLabel = null;

		while (this.parser.tokenStreamStack.length > 0) {
			// const token = this.peekToken(0);
			const token = this.parser.nextToken();
			// If no token or EOF, pop the active stream
			if (!token || token.type === "EOF") {
				const poppedStream = this.parser.popTokenStream(false); // Don't emit event yet
				if (this.parser.tokenStreamStack.length === 0) break;
				if (poppedStream) {
					this.emitter.emit(`endOfStream:${poppedStream.id}`);
					// if (this.symbolTable.getCurrentNamespace().startsWith("__MACRO_")) this.symbolTable.popScope();
				}
				continue;
			}

			switch (token.type) {
				case "OPERATOR": {
					if (token.value === "*") {
						this.lastGlobalLabel = "*";
						break;
					}

					if (token.value === "=" && this.lastGlobalLabel) {
						this.handleSymbolInPassTwo(this.lastGlobalLabel, token);
						break;
					}
					throw new Error(`Syntax error in line ${token.line}`);
				}

				case "IDENTIFIER": {
					if (this.macroHandler.isMacro(token.value)) {
						this.macroHandler.expandMacro(token);
						break;
					}

					if (this.cpuHandler.isInstruction(token.value)) {
						this.handleInstructionPassTwo(token as OperatorStackToken);
						break;
					}

					this.lastGlobalLabel = token.value;
					// if (this.symbolTable.lookupSymbol(token.value) !== undefined) {
					// It's a label definition (e.g., MyLoop:).
					// Consume only the label token, and let the loop handle the instruction on the next iteration.
					// 	this.lastGlobalLabel = token.value;
					// 	break;
					// }

					break;
				}

				case "DOT": {
					const directiveToken = this.parser.nextToken() as ScalarToken;
					if (directiveToken?.type !== "IDENTIFIER") throw new Error(`Syntax error in line ${token.line}`);

					const streamBefore = this.parser.tokenStreamStack.length;
					const directiveContext = {
						pc: this.currentPC,
						macroArgs: this.parser.tokenStreamStack[this.parser.tokenStreamStack.length - 1].macroArgs,
						currentGlobalLabel: this.lastGlobalLabel,
						options: this.options,
					};

					this.directiveHandler.handlePassTwoDirective(directiveToken, directiveContext);

					if (this.parser.tokenStreamStack.length > streamBefore) {
						// A new stream was pushed. The active context has changed, so we must start at its beginning.
						this.parser.setPosition(0);
						break;
					}
					break;
				}

				case "LABEL":
					this.lastGlobalLabel = token.value;
					this.symbolTable.setSymbol(token.value, this.currentPC);
					this.logger.log(`Defined label ${token.value} @ $${getHex(this.currentPC)}`);
					break;

				// case "LOCAL_LABEL":
				// 	this.currentTokenIndex++;
				// 	break;
				case "ANONYMOUS_LABEL_DEF":
					this.anonymousLabels.push(this.currentPC);
					break;
			}
		}
	}

	public handleSymbolInPassOne(_nextToken: Token, labelToken: string) {
		const expressionTokens = this.parser.getInstructionTokens();

		const value = this.expressionEvaluator.evaluate(expressionTokens, {
			pc: this.currentPC,
			allowForwardRef: true,
			currentGlobalLabel: this.lastGlobalLabel, // Added for .EQU
			options: this.options,
			macroArgs: this.parser.tokenStreamStack[this.parser.tokenStreamStack.length - 1].macroArgs,
		});

		if (Array.isArray(value)) this.logger.log(`Defined array symbol ${labelToken} with ${value.length} elements.`);
		else this.logger.log(`Defined symbol ${labelToken} = $${value.toString(16).toUpperCase()}`);

		// if (this.symbolTable.lookupSymbol(labelToken) !== undefined) this.symbolTable.setSymbol(labelToken, value);
		if (this.symbolTable.isDefined(labelToken)) this.symbolTable.setSymbol(labelToken, value);
		else this.symbolTable.addSymbol(labelToken, value);
	}

	public handleSymbolInPassTwo(label: string, token: ScalarToken) {
		// Re-evaluate symbol assignment in Pass 2 so forward-references
		// that were unresolved in Pass 1 can be resolved now.

		const expressionTokens = this.parser.getExpressionTokens(token);

		try {
			const value = this.expressionEvaluator.evaluate(expressionTokens, {
				pc: this.currentPC,
				allowForwardRef: false, // now require resolution
				currentGlobalLabel: this.lastGlobalLabel,
				options: this.options,
				macroArgs: this.parser.tokenStreamStack[this.parser.tokenStreamStack.length - 1].macroArgs,
				assembler: this,
			});

			// If evaluation produced undefined, treat as an error in Pass 2
			if (value === undefined) {
				this.logger.error(`ERROR defining .EQU for ${label}: unresolved expression`);
				throw new Error(`Pass 2: Unresolved assignment for ${label} on line ${token.line}`);
			}

			let logLine = `${label}`;
			switch (typeof value) {
				case "object":
					if (Array.isArray(value)) logLine += `= [${value.map((v) => v.value).join(",")}]`;
					else logLine += `= ${value}`;
					break;
				case "number":
					logLine += `= $${getHex(value)}`;
					break;
				case "string":
					logLine += `= "${value}"`;
					break;
			}
			this.logger.log(logLine);

			// If symbol exists already, update it; otherwise add it as a constant.
			if (this.symbolTable.lookupSymbol(label) !== undefined) this.symbolTable.setSymbol(label, value);
			else this.symbolTable.addSymbol(label, value);
		} catch (e) {
			this.logger.error(`ERROR defining .EQU for ${label}: ${e}`);
			throw e instanceof Error ? e : new Error(String(e));
		}
	}

	private handleInstructionPassOne(mnemonicToken: ScalarToken): void {
		let operandTokens = this.parser.getInstructionTokens(mnemonicToken) as OperatorStackToken[];

		const currentStream = this.parser.tokenStreamStack[this.parser.tokenStreamStack.length - 1];
		if (currentStream.macroArgs) operandTokens = this.substituteTokens(operandTokens, currentStream.macroArgs) as OperatorStackToken[];

		// It's an instruction. Resolve its size and advance the PC.
		try {
			const sizeInfo = this.cpuHandler.resolveAddressingMode(mnemonicToken.value, operandTokens, (exprTokens) =>
				this.expressionEvaluator.evaluateAsNumber(exprTokens, {
					pc: this.currentPC,
					allowForwardRef: true,
					currentGlobalLabel: this.lastGlobalLabel,
					options: this.options,
					assembler: this,
				}),
			);
			this.currentPC += sizeInfo.bytes;
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : String(e);
			throw `ERROR on line ${mnemonicToken.line}: Could not determine size of instruction '${mnemonicToken.value}'. ${errorMessage}`;
		}
	}

	private handleInstructionPassTwo(mnemonicToken: OperatorStackToken): void {
		{
			const instructionPC = this.currentPC;
			// It's an instruction.
			let operandTokens = this.parser.getInstructionTokens(mnemonicToken) as OperatorStackToken[];

			const currentStream = this.parser.tokenStreamStack[this.parser.tokenStreamStack.length - 1];
			if (currentStream.macroArgs) operandTokens = this.substituteTokens(operandTokens, currentStream.macroArgs) as OperatorStackToken[];

			if (this.isAssembling) {
				try {
					// 1. Resolve Mode & Address
					const modeInfo = this.cpuHandler.resolveAddressingMode(mnemonicToken.value, operandTokens, (exprTokens) =>
						this.expressionEvaluator.evaluateAsNumber(exprTokens, {
							pc: this.currentPC,
							macroArgs: this.parser.tokenStreamStack[this.parser.tokenStreamStack.length - 1].macroArgs,
							assembler: this,
							currentGlobalLabel: this.lastGlobalLabel,
							options: this.options,
						}),
					);

					// 2. Encode Bytes using resolved info
					const encodedBytes = this.cpuHandler.encodeInstruction([mnemonicToken, ...operandTokens], {
						...modeInfo,
						pc: this.currentPC,
					});

					// 3. LOGGING (New location)
					const hexBytes = encodedBytes.map((b) => getHex(b)).join(" ");
					const addressHex = instructionPC.toString(16).padStart(4, "0").toUpperCase();
					const operandString = operandTokens.map((t) => (t.type === "NUMBER" ? `$${getHex(Number(t.value))}` : t.value)).join("");
					this.logger.log(`${addressHex}: ${hexBytes.padEnd(8)} | ${mnemonicToken.value} ${operandString} ; Line ${mnemonicToken.line}`);

					this.linker.writeBytes(this.currentPC, encodedBytes);
					this.currentPC += encodedBytes.length;
				} catch (e) {
					const errorMessage = e instanceof Error ? e.message : String(e);
					this.logger.error(`\nFATAL ERROR on line ${mnemonicToken.line}: Invalid instruction syntax or unresolved symbol. Error: ${errorMessage}`);
					throw new Error(`Assembly failed on line ${mnemonicToken.line}: ${errorMessage}`);
				}
			} else {
				// Not assembling: just advance PC
				this.currentPC += this.getInstructionSize();
			}
		}
	}

	public getInstructionSize(): number {
		try {
			const instructionTokens = this.parser.getInstructionTokens();
			const mnemonicToken = instructionTokens[0] as ScalarToken;
			const operandTokens = instructionTokens.slice(1) as OperatorStackToken[];

			const sizeInfo = this.cpuHandler.resolveAddressingMode(mnemonicToken.value, operandTokens, (exprTokens) =>
				this.expressionEvaluator.evaluateAsNumber(exprTokens, {
					pc: this.currentPC,
					macroArgs: this.parser.tokenStreamStack[this.parser.tokenStreamStack.length - 1].macroArgs,
					currentGlobalLabel: this.lastGlobalLabel, // Added for instruction size evaluation
					options: this.options,
				}),
			);
			return sizeInfo.bytes;
		} catch (_e) {
			return this.cpuHandler.cpuType === "ARM_RISC" ? 4 : 3; // Robust default based on CPU type
		}
	}

	// private extractExpressionArrayTokens(tokens: Token[]) {
	// 	const result: Token[][] = [];
	// 	let current: Token[] = [];
	// 	let parenDepth = 0;

	// 	if (tokens.length < 2) return result;
	// 	if (tokens[0].value !== "[" || tokens[tokens.length - 1].value !== "]") return result;

	// 	// for (const token of tokens) {
	// 	for (let idx = 1; idx < tokens.length - 1; idx++) {
	// 		const token = tokens[idx];
	// 		if (token.type === "OPERATOR" && token.value === "(") parenDepth++;
	// 		if (token.type === "OPERATOR" && token.value === ")") parenDepth--;
	// 		if (token.type === "COMMA" && parenDepth === 0) {
	// 			result.push(current);
	// 			current = [];
	// 		} else {
	// 			current.push(token);
	// 		}
	// 	}
	// 	if (current.length > 0) result.push(current);

	// 	return result;
	// }

	private substituteTokens(tokens: Token[], macroArgs: Map<string, Token[]>): Token[] {
		const result: Token[] = [];
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];

			if (token.type !== "IDENTIFIER" || !macroArgs.has(token.value)) {
				result.push(token);
				continue;
			}

			// Token is a macro argument.

			// Check for array access like `parms[0]`
			if (i + 1 < tokens.length && tokens[i + 1].value === "[") {
				let j = i + 2;
				let parenDepth = 0;
				const indexTokens = [];

				// Find closing ']' and gather index tokens
				while (j < tokens.length) {
					if (tokens[j].value === "[") parenDepth++;
					else if (tokens[j].value === "]") {
						if (parenDepth === 0) break;
						parenDepth--;
					}
					indexTokens.push(tokens[j]);
					j++;
				}

				// If we found a complete `[...]` expression
				if (j < tokens.length && tokens[j].value === "]") {
					const indexValue = this.expressionEvaluator.evaluateAsNumber(indexTokens, {
						pc: this.currentPC,
						macroArgs: macroArgs, // Pass current macro args for evaluation context
						assembler: this,
						currentGlobalLabel: this.lastGlobalLabel,
						options: this.options,
					});

					// const argTokens = macroArgs.get(token.value) ?? [];
					// const expressions = this.extractExpressionArrayTokens(argTokens);
					const argTokens = macroArgs.get(token.value) ?? [];

					// if(expressions[0].type==="ARRAY") expressions = expressions[0].value;
					const expressions = argTokens[0].value as Token[][];

					if (indexValue < 0 || indexValue >= expressions.length)
						throw new Error(`Macro argument index ${indexValue} out of bounds for argument '${token.value}' on line ${token.line}.`);

					// result.push(...expressions[indexValue]);
					result.push(...expressions[indexValue]);
					i = j; // Advance main loop past `]`
					continue;
				}
			}

			// If not array access, it's a simple substitution
			result.push(...(macroArgs.get(token.value) ?? []));
		}
		return result;
	}
}
