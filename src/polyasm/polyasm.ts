import { EventEmitter } from "node:events";
import type { CPUHandler } from "./cpu/cpuhandler.class";
import { DirectiveHandler } from "./directives/handler";
import { MacroHandler } from "./directives/macro/handler";
import type { MacroDefinition } from "./directives/macro/macro.interface";
import { ExpressionEvaluator } from "./expression";
import { AssemblyLexer, type IdentifierToken, type OperatorStackToken, type ScalarToken, type Token } from "./lexer/lexer.class";
import { Linker, type Segment } from "./linker.class";
import { Logger } from "./logger";
import type { AssemblerOptions, DataProcessor, FileHandler, StreamState } from "./polyasm.types";
import { PASymbolTable } from "./symbol.class";

const DEFAULT_PC = 0x1000;

export class Assembler {
	public lexer: AssemblyLexer;
	private activeTokens: Token[];
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
	public tokenStreamStack: StreamState[] = [];
	private streamIdCounter = 0;

	public pass: number;

	public expressionEvaluator: ExpressionEvaluator;
	public directiveHandler: DirectiveHandler;
	public macroHandler: MacroHandler;
	private rawDataProcessors?: Map<string, DataProcessor>;
	public emitter: EventEmitter;

	constructor(handler: CPUHandler, fileHandler: FileHandler, options?: AssemblerOptions) {
		this.activeTokens = [];
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
		this.cpuHandler = handler;
		this.emitter = new EventEmitter();

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

		// for (const b of bytes) {
		// 	this.linker.writeByte(this.currentPC, b);
		// 	this.currentPC += 1;
		// }
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
		// Start streaming tokens instead of tokenizing the entire source.
		this.lexer.startStream(source);
		this.activeTokens = this.lexer.getBufferedTokens();

		// Set assembler options from the pre-scan so they are available in Pass 1
		if (localLabelStyle) this.options.set("local_label_style", localLabelStyle);

		// Initialize token stream stack so Pass 1 can use positional helpers.
		this.tokenStreamStack = [];
		this.streamIdCounter = 0;
		this.tokenStreamStack.push({
			id: this.streamIdCounter,
			tokens: this.activeTokens,
			index: 0,
		});
		this.activeTokens = this.tokenStreamStack[this.tokenStreamStack.length - 1].tokens;

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
		this.tokenStreamStack = [];
		this.streamIdCounter = 0;
		this.tokenStreamStack.push({
			id: this.streamIdCounter,
			tokens: this.activeTokens,
			index: 0,
		});
		this.activeTokens = this.tokenStreamStack[this.tokenStreamStack.length - 1].tokens;

		this.passTwo();

		this.logger.log(`\n--- Assembly Complete (${this.cpuHandler.cpuType}) ---`);
		this.logger.log(`Final PC location: $${this.currentPC.toString(16).toUpperCase().padStart(4, "0")}`);

		// All emitted bytes are stored in the linker segments (a default segment was created if none existed).
		return this.linker.segments;
	}

	public getLastGlobalLabel(): string | null {
		return this.lastGlobalLabel;
	}

	private passOne(): void {
		this.logger.log(`\n--- Starting Pass 1: PASymbol Definition & PC Calculation (${this.cpuHandler.cpuType}) ---`);

		this.pass = 1;
		this.setPosition(0);
		this.anonymousLabels = [];
		this.lastGlobalLabel = null;

		if (this.linker.segments.length) this.currentPC = this.linker.segments.length ? this.linker.segments[0].start : DEFAULT_PC;

		while (true) {
			// const token = this.peekToken(0);
			const token = this.nextToken();
			if (!token || token.type === "EOF") break;

			// Always update PC symbol before any instruction/data
			// this.symbolTable.setSymbol("*", this.currentPC);

			switch (token.type) {
				// case "DIRECTIVE": {
				case "DOT": {
					const nextToken = this.peekToken(0);
					if (nextToken?.type !== "IDENTIFIER") throw new Error(`Syntax error in line ${token.line}`);

					const directiveToken = this.nextToken() as ScalarToken;
					const directiveContext = {
						pc: this.currentPC,
						allowForwardRef: true,
						currentGlobalLabel: this.lastGlobalLabel,
						options: this.options,
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
						this.handleLabelInPassOne(token, this.lastGlobalLabel);
						break;
					}
					throw new Error(`Syntax error in line ${token.line}`);
				}

				case "IDENTIFIER":
				case "LABEL": {
					// PRIORITY 1: SYMBOL ASSIGNMENT (IDENTIFIER .EQU VALUE)
					// const nextToken = this.peekToken(0);
					// if (nextToken && (nextToken.value === "EQU" || nextToken.value === "=" || nextToken.value === ":")) {
					// 	this.consume(1);
					// 	this.handleLabelInPassOne(nextToken, token as ScalarToken);
					// 	break;
					// }

					// PRIORITY 2: MACRO
					if (this.macroHandler.isMacro(token.value)) {
						this.setPosition(this.skipToEndOfLine(this.getPosition()));
						break;
					}

					// PRIORITY 3: CPU INSTRUCTION OR ...
					// A mnemonic must be a string. If it's an array, it's an error.
					if (typeof token.value !== "string") throw new Error("Invalid instruction: Mnemonic cannot be an array.");

					// Check if the mnemonic is a known instruction for the current CPU.
					if (this.cpuHandler.isInstruction(token.value)) {
						this.handleInstructionPassOne(token as ScalarToken);
						break;
					}

					// PRIORITY 3: ... OR LABEL
					// It's not a known instruction, so treat it as a label definition.
					this.lastGlobalLabel = token.value;
					this.symbolTable.addSymbol(token.value, this.currentPC);
					this.logger.log(`[PASS 1] Defined label ${token.value} @ $${this.currentPC.toString(16).toUpperCase()}`);

					break;
				}

				case "LOCAL_LABEL": {
					if (this.lastGlobalLabel) {
						const qualifiedName = `${this.lastGlobalLabel}.${token.value}`;
						this.symbolTable.addSymbol(qualifiedName, this.currentPC);
						break;
					}

					this.logger.error(`[PASS 1] ERROR on line ${token.line}: Local label ':${token.value}' defined without a preceding global label.`);
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

		while (this.tokenStreamStack.length > 0) {
			// const token = this.peekToken(0);
			const token = this.nextToken();
			// If no token or EOF, pop the active stream
			if (!token || token.type === "EOF") {
				const poppedStream = this.popTokenStream(false); // Don't emit event yet
				if (this.tokenStreamStack.length === 0) break;
				if (poppedStream) this.emitter.emit(`endOfStream:${poppedStream.id}`);
				continue;
			}

			// this.symbolTable.setSymbol("*", this.currentPC);

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
					// const nextToken = this.peekToken(0);
					// if (nextToken?.value === ".EQU" || nextToken?.value === "=") {
					// 	this.handleSymbolInPassTwo(token as ScalarToken);
					// 	break;
					// }

					if (this.macroHandler.isMacro(token.value)) {
						this.macroHandler.expandMacro(token);
						break;
					}

					if (this.cpuHandler.isInstruction(token.value)) {
						const instructionPC = this.currentPC;
						// It's an instruction.
						const mnemonicToken = token as OperatorStackToken;
						const operandTokens = this.getInstructionTokens(mnemonicToken) as OperatorStackToken[];

						if (this.isAssembling) {
							try {
								// 1. Resolve Mode & Address
								const modeInfo = this.cpuHandler.resolveAddressingMode(mnemonicToken.value, operandTokens, (exprTokens) =>
									this.expressionEvaluator.evaluateAsNumber(exprTokens, {
										pc: this.currentPC,
										macroArgs: this.tokenStreamStack[this.tokenStreamStack.length - 1].macroArgs,
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
								const hexBytes = encodedBytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
								const addressHex = instructionPC.toString(16).padStart(4, "0").toUpperCase();
								const operandString = operandTokens.map((t) => t.value).join("");
								this.logger.log(`${addressHex}: ${hexBytes.padEnd(8)} | ${mnemonicToken.value} ${operandString} ; Line ${token.line}`);

								this.linker.writeBytes(this.currentPC, encodedBytes);
								this.currentPC += encodedBytes.length;

								// Write each encoded byte into the segment that covers the current PC
								// for (const b of encodedBytes) {
								// 	this.linker.writeByte(this.currentPC, b);
								// 	this.currentPC += 1;
								// }
							} catch (e) {
								const errorMessage = e instanceof Error ? e.message : String(e);
								this.logger.error(`\nFATAL ERROR on line ${token.line}: Invalid instruction syntax or unresolved symbol. Error: ${errorMessage}`);
								throw new Error(`Assembly failed on line ${token.line}: ${errorMessage}`); // Stop execution
							}
						} else {
							// Not assembling: just advance PC
							this.currentPC += this.getInstructionSize();
						}
						// this.setPosition(this.skipToEndOfLine());
						break;
					}

					if (this.symbolTable.lookupSymbol(token.value) !== undefined) {
						// It's a label definition (e.g., MyLoop:).
						// Consume only the label token, and let the loop handle the instruction on the next iteration.
						this.lastGlobalLabel = token.value;
						break;
					}

					break;
				}

				case "DOT": {
					const nextToken = this.peekToken(0);
					if (nextToken?.type !== "IDENTIFIER") throw new Error(`Syntax error in line ${token.line}`);

					const directiveToken = this.nextToken() as ScalarToken;
					const streamBefore = this.tokenStreamStack.length;
					const directiveContext = {
						pc: this.currentPC,
						macroArgs: this.tokenStreamStack[this.tokenStreamStack.length - 1].macroArgs,
						currentGlobalLabel: this.lastGlobalLabel,
						options: this.options,
					};

					this.directiveHandler.handlePassTwoDirective(directiveToken, directiveContext);

					if (this.tokenStreamStack.length > streamBefore) {
						// A new stream was pushed. The active context has changed, so we must start at its beginning.
						this.setPosition(0);
						break;
					}
					break;
				}

				case "LABEL":
					this.lastGlobalLabel = token.value;
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

	/** Ensures a token at `index` is buffered and returns it. */
	private ensureToken(index: number): Token | null {
		// If the current activeTokens is the lexer's buffer, request buffering from lexer.
		const lexerBuffer = this.lexer.getBufferedTokens();
		if (this.activeTokens === lexerBuffer) {
			const t = this.lexer.ensureBuffered(index);
			// refresh reference in case lexer expanded the buffer
			this.activeTokens = lexerBuffer;
			return t;
		}
		// Otherwise we're operating on a pushed token stream (macro/block) that's an array.
		return this.activeTokens[index] ?? null;
	}

	/** Get current stream position (internal index). */
	public getPosition(): number {
		if (this.tokenStreamStack.length === 0) return 0;
		return this.tokenStreamStack[this.tokenStreamStack.length - 1].index;
	}

	/** Set current stream position (internal index). */
	public setPosition(pos: number): void {
		if (this.tokenStreamStack.length === 0) return;
		this.tokenStreamStack[this.tokenStreamStack.length - 1].index = pos;
	}

	/** Peek relative to the current token pointer (0 == current). */
	public peekToken(offset = 0): Token | null {
		return this.ensureToken(this.getPosition() + offset);
	}

	public peekTokenUnbuffered(offset = 0): Token | null {
		const lexerPos = this.lexer.getPosition();
		const token = this.ensureToken(this.getPosition() + offset);
		this.lexer.rewind(offset + 1, lexerPos);
		return token;
	}

	/** Read and consume the next token from the active stream. */
	public nextToken(options?: { endMarker?: string }): Token | null {
		const pos = this.getPosition();
		if (options?.endMarker) this.lexer.setEndMarker(options.endMarker);
		const t = this.ensureToken(pos);
		if (options?.endMarker) this.lexer.setEndMarker(undefined);
		if (t) this.setPosition(pos + 1);
		return t;
	}

	public nextIdentifierToken(identifier?: string): IdentifierToken | null {
		const pos = this.getPosition();
		const t = this.ensureToken(pos);
		if (!t || t.type !== "IDENTIFIER" || (identifier && t.value !== identifier)) return null;
		this.setPosition(pos + 1);
		return t as IdentifierToken;
	}

	/** Advance the current token pointer by `n`. */
	public consume(n = 1): void {
		this.setPosition(this.getPosition() + n);
	}

	/** Slice tokens from start (inclusive) to end (exclusive) using buffered access. */
	public sliceTokens(start: number, end: number): Token[] {
		const out: Token[] = [];
		for (let i = start; i < end; i++) {
			const t = this.ensureToken(i);
			if (!t) break;
			out.push(t);
		}
		return out;
	}

	/** Returns all tokens on the current line starting at optional offset (relative). */
	public getLineTokens(offset = 0): Token[] {
		const out: Token[] = [];
		const base = this.getPosition() + offset;
		const start = this.ensureToken(base);
		if (!start) return out;
		const line = start.line;
		let i = base;
		while (true) {
			const t = this.ensureToken(i);
			if (!t) break;
			if (t.line !== line) break;
			out.push(t);
			i++;
		}
		return out;
	}

	/** Consumes tokens until the end of the current line (advances position to next line). */
	public consumeLine(): void {
		const startPos = this.getPosition();
		const startToken = this.ensureToken(startPos);
		if (!startToken) return;
		const line = startToken.line;
		let i = startPos;
		while (true) {
			const t = this.ensureToken(i);
			if (!t) break;
			i++;
			if (t.line !== line) break;
		}
		this.setPosition(i);
	}

	public handleLabelInPassOne(nextToken: Token, labelToken: string): void {
		switch (nextToken.value) {
			case "EQU":
			case "=": {
				// Start expression after .EQU or =
				const expressionTokens = this.getInstructionTokens();

				try {
					const value = this.expressionEvaluator.evaluate(expressionTokens, {
						pc: this.currentPC,
						allowForwardRef: true,
						currentGlobalLabel: this.lastGlobalLabel, // Added for .EQU
						options: this.options,
					});

					if (Array.isArray(value)) this.logger.log(`[PASS 1] Defined array symbol ${labelToken} with ${value.length} elements.`);
					else this.logger.log(`[PASS 1] Defined symbol ${labelToken} = $${value.toString(16).toUpperCase()}`);

					if (this.symbolTable.lookupSymbol(labelToken) !== undefined) this.symbolTable.setSymbol(labelToken, value);
					else this.symbolTable.addSymbol(labelToken, value);
				} catch (e) {
					this.logger.error(`[PASS 1] ERROR defining .EQU for ${labelToken}: ${e}`);
				}

				break;
			}

			// case ":": {
			// 	this.lastGlobalLabel = token.value;
			// 	this.symbolTable.addSymbol(token.value, this.currentPC);
			// 	this.logger.log(`[PASS 1] Defined label ${token.value} @ $${this.currentPC.toString(16).toUpperCase().padStart(4, "0")}`);

			// 	// Consume the label (IDENTIFIER) AND the colon (OPERATOR)
			// 	this.consume(2);
			// 	break;
			// }
		}
	}

	public handleSymbolInPassTwo(label: string, token: ScalarToken): void {
		// Re-evaluate symbol assignment in Pass 2 so forward-references
		// that were unresolved in Pass 1 can be resolved now.

		const expressionTokens = this.getExpressionTokens(token);

		try {
			const value = this.expressionEvaluator.evaluate(expressionTokens, {
				pc: this.currentPC,
				allowForwardRef: false, // now require resolution
				currentGlobalLabel: this.lastGlobalLabel,
				options: this.options,
			});

			// If evaluation produced undefined, treat as an error in Pass 2
			if (value === undefined) {
				this.logger.error(`[PASS 2] ERROR defining .EQU for ${label}: unresolved expression`);
				throw new Error(`Pass 2: Unresolved assignment for ${label} on line ${token.line}`);
			}

			if (Array.isArray(value)) this.logger.log(`[PASS 2] Defined array symbol ${label} with ${value.length} elements.`);
			else this.logger.log(`[PASS 2] Defined symbol ${label} = $${(value as number).toString(16).toUpperCase()}`);

			// If symbol exists already, update it; otherwise add it as a constant.
			if (this.symbolTable.lookupSymbol(label) !== undefined) this.symbolTable.setSymbol(label, value);
			else this.symbolTable.addSymbol(label, value);
		} catch (e) {
			this.logger.error(`[PASS 2] ERROR defining .EQU for ${label}: ${e}`);
			throw e instanceof Error ? e : new Error(String(e));
		}
	}

	private handleInstructionPassOne(mnemonicToken: ScalarToken): void {
		const operandTokens = this.getInstructionTokens(mnemonicToken);

		// It's an instruction. Resolve its size and advance the PC.
		try {
			const sizeInfo = this.cpuHandler.resolveAddressingMode(mnemonicToken.value, operandTokens as OperatorStackToken[], (exprTokens) =>
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
			this.logger.error(`[PASS 1] ERROR on line ${mnemonicToken.line}: Could not determine size of instruction '${mnemonicToken.value}'. ${errorMessage}`);
			// In case of error, assume a default size to prevent cascading PC errors.
			// A better approach might be to halt or use a more intelligent guess.
			this.currentPC += 1;
		}
	}

	/** Returns the ID that will be used for the next stream. */
	public getNextStreamId(): number {
		return this.streamIdCounter + 1;
	}

	/** Pushes the current stream state and activates a new stream (macro/loop body). */
	public pushTokenStream(newTokens: Token[], macroArgs?: Map<string, Token[]>, streamId?: number): number {
		// Save current position and arguments
		this.tokenStreamStack[this.tokenStreamStack.length - 1].index = this.getPosition();

		const newStreamId = streamId ?? ++this.streamIdCounter;
		if (streamId) this.streamIdCounter = Math.max(this.streamIdCounter, streamId);

		// Push new context onto the stack
		this.tokenStreamStack.push({
			id: newStreamId,
			tokens: newTokens,
			index: 0,
			macroArgs: macroArgs,
		});

		// Activate new stream
		this.activeTokens = newTokens;
		this.setPosition(0);
		return newStreamId;
	}

	/** Restores the previous stream state after a macro/loop finishes. */
	private popTokenStream(emitEvent = true): StreamState | undefined {
		const poppedStream = this.tokenStreamStack.pop();
		if (poppedStream && emitEvent) this.emitter.emit(`endOfStream:${poppedStream.id}`);

		// If the popped stream was a macro, its scope name will start with __MACRO_.
		// This is our cue to pop the symbol scope as well.
		if (this.symbolTable.getCurrentNamespace().startsWith("__MACRO_")) {
			this.symbolTable.popScope();
		}

		if (this.tokenStreamStack.length > 0) {
			const previousState = this.tokenStreamStack[this.tokenStreamStack.length - 1];
			this.activeTokens = previousState.tokens;
			this.setPosition(previousState.index);
		}
		return poppedStream;
	}

	public getInstructionTokens(instructionToken?: Token): Token[] {
		const tokens: Token[] = [];

		const startToken = this.peekToken();
		if (startToken?.type === "EOF") return tokens;
		if (instructionToken && instructionToken.line !== startToken?.line) return tokens;

		this.consume(1);
		if (!startToken) return tokens;

		tokens.push(startToken);

		const startLine = instructionToken ? instructionToken.line : startToken.line;
		while (true) {
			let token = this.peekToken();
			if (!token) break;
			if (token.line !== startLine) break;
			if (token.type === "LBRACE" || token.type === "RBRACE" || token.type === "EOF") break;
			token = this.nextToken();
			if (token) tokens.push(token);
		}
		return tokens;
	}

	public getExpressionTokens(instructionToken?: Token): Token[] {
		const tokens: Token[] = [];

		const startToken = this.peekToken();
		if (startToken?.type === "EOF") return tokens;
		if (instructionToken && instructionToken.line !== startToken?.line) return tokens;

		this.consume(1);
		if (!startToken) return tokens;

		tokens.push(startToken);

		const startLine = instructionToken ? instructionToken.line : startToken.line;
		while (true) {
			let token = this.peekToken();
			if (!token) break;
			if (token.line !== startLine) break;
			if (token.type === "LBRACE" || token.type === "RBRACE" || token.type === "EOF" || token.type === "COMMA") break;
			token = this.nextToken();
			if (token) tokens.push(token);
		}
		return tokens;
	}

	public getDirectiveBlockTokens(startDirective: string): Token[] | null {
		const tokens: Token[] = [];
		let depth = 0;

		while (true) {
			const token = this.nextToken();
			if (!token) return null;

			// Check for block start
			const nextToken = this.peekToken();
			if (token.type === "DOT" && nextToken?.type === "IDENTIFIER") {
				this.consume();
				switch (nextToken?.value) {
					case startDirective:
						depth++;
						break;

					case "END":
						depth--;
						if (depth <= 0) return tokens; // Don't include .END
						break;
				}
				tokens.push(token);
				tokens.push(nextToken);
				continue;
			}

			if (token.value === "{") {
				depth++;
				// Don't push opening brace
				continue;
			}

			if (token.value === "}") {
				depth--;
				if (depth === 0) return tokens; // Don't include closing brace

				tokens.push(token);
				continue;
			}

			// Regular token
			tokens.push(token);
		}
	}

	public skipToEndOfLine(startIndex?: number): number {
		const start = startIndex ?? this.getPosition();
		const startToken = this.ensureToken(start);
		if (!startToken) return start;
		const startLine = startToken.line;
		let i = start + 1;
		while (true) {
			const t = this.ensureToken(i);
			if (!t) break;
			if (t.line !== startLine) break;
			if (t.type === "LBRACE" || t.type === "RBRACE") break;
			i++;
		}
		return i;
	}

	/** * Finds the token index of the matching block-ending structure ('.END' or '}')
	 * for the starting block (directive or '{'). Accepts both typed block tokens
	 * and plain '{' / '}' operator tokens emitted by the tokenizer.
	 */
	public skipToDirectiveEnd(startDirective: string): number {
		let depth = 0;
		const start = this.getPosition();

		let i = start + 1;
		while (true) {
			// const token = this.ensureToken(i) as ScalarToken | null;
			const token = this.peekToken();
			if (token?.type === "EOF") break;

			this.consume(1);
			if (!token) break;

			const nextToken = this.peekToken();
			if (token.type === "DOT" && nextToken?.type === "IDENTIFIER") {
				this.consume();
				switch (nextToken?.value) {
					case startDirective:
						depth++;
						break;

					case "END":
						depth--;
						if (depth <= 0) return i; // Don't include .END
						break;
				}
				i += 2;
				continue;
			}

			if (token.value === "{") {
				depth++;
			}

			if (token.value === "}") {
				depth--;
				if (depth === 0) return i;
			}

			i++;
		}

		// Not found
		return 0;
	}

	public getInstructionSize(): number {
		try {
			const instructionTokens = this.getInstructionTokens();
			const mnemonicToken = instructionTokens[0] as ScalarToken;
			const operandTokens = instructionTokens.slice(1) as OperatorStackToken[];

			const sizeInfo = this.cpuHandler.resolveAddressingMode(mnemonicToken.value, operandTokens, (exprTokens) =>
				this.expressionEvaluator.evaluateAsNumber(exprTokens, {
					pc: this.currentPC,
					macroArgs: this.tokenStreamStack[this.tokenStreamStack.length - 1].macroArgs,
					currentGlobalLabel: this.lastGlobalLabel, // Added for instruction size evaluation
					options: this.options,
				}),
			);
			return sizeInfo.bytes;
		} catch (_e) {
			return this.cpuHandler.cpuType === "ARM_RISC" ? 4 : 3; // Robust default based on CPU type
		}
	}
}
