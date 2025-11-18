import type { CPUHandler } from "./cpu/cpuhandler.class";
import { PASymbolTable } from "./symbol.class";
import { Logger } from "./logger";
import { ExpressionEvaluator } from "./expression";
import { DirectiveHandler } from "./directives/handler";
import { type Token, AssemblyLexer, type OperatorStackToken, type ScalarToken } from "./lexer/lexer.class";
import { EventEmitter } from "node:events";
import type { MacroDefinition } from "./directives/macro/macro.interface";
import { ADVANCE_TO_NEXT_LINE } from "./directives/directive.interface";

/** Defines the state of an active token stream. */
interface StreamState {
	id: number;
	tokens: Token[];
	index: number;
	macroArgs?: Map<string, Token[]>;
}

export interface FileHandler {
	/** Reads raw source content and returns the string content for .INCLUDE. */
	readSourceFile(filename: string): string;

	/** Reads raw file content and returns the byte array for .INCBIN. */
	readBinaryFile(filename: string): number[];
}

export class Assembler {
	// Was public
	public lexer: AssemblyLexer;
	public activeTokens: Token[];
	public currentTokenIndex = 0;
	private cpuHandler: CPUHandler;
	public symbolTable: PASymbolTable;
	public fileHandler: FileHandler;
	public currentPC: number;

	public outputBuffer: number[] = [];
	public isAssembling = true;

	private lastGlobalLabel: string | null = null;
	public anonymousLabels: number[] = [];

	public macroDefinitions: Map<string, MacroDefinition> = new Map();
	public options: Map<string, string> = new Map();

	public logger: Logger;
	public tokenStreamStack: StreamState[] = [];
	private streamIdCounter = 0;

	public expressionEvaluator: ExpressionEvaluator;
	public directiveHandler: DirectiveHandler;
	public emitter: EventEmitter;

	constructor(handler: CPUHandler, fileHandler: FileHandler, logger?: Logger) {
		this.activeTokens = [];
		this.cpuHandler = handler;
		this.fileHandler = fileHandler;
		this.logger = logger ?? new Logger();

		this.currentPC = 0x0000;
		this.symbolTable = new PASymbolTable();
		this.symbolTable.addSymbol("*", this.currentPC);

		this.expressionEvaluator = new ExpressionEvaluator(this.symbolTable, this.logger);
		this.directiveHandler = new DirectiveHandler(this, this.logger);
		this.lexer = new AssemblyLexer();
		this.cpuHandler = handler;
		this.emitter = new EventEmitter();
	}

	public assemble(source: string): number[] {
		// Pre-scan for lexer-affecting options
		const optionMatch = /^\s*\.OPTION\s+local_label_style\s+"(.)"/im.exec(source);
		const localLabelStyle = optionMatch ? optionMatch[1] : ":";

		// Initialize or re-initialize the lexer with the found option.
		this.lexer = new AssemblyLexer({ localLabelStyle });
		this.activeTokens = this.lexer.tokenize(source);

		// Set assembler options from the pre-scan so they are available in Pass 1
		if (localLabelStyle) {
			this.options.set("local_label_style", localLabelStyle);
		}

		this.passOne();

		this.currentPC = (this.symbolTable.lookupSymbol("*") as number) || 0x0000;
		this.outputBuffer = [];
		this.currentTokenIndex = 0;
		this.tokenStreamStack = [];
		this.streamIdCounter = 0;
		this.tokenStreamStack.push({ id: this.streamIdCounter, tokens: this.activeTokens, index: 0 });
		this.activeTokens = this.tokenStreamStack[this.tokenStreamStack.length - 1].tokens;

		this.passTwo();

		this.logger.log(`\n--- Assembly Complete (${this.cpuHandler.cpuType}) ---`);
		this.logger.log(`Final PC location: $${this.currentPC.toString(16).toUpperCase().padStart(4, "0")}`);
		return this.outputBuffer;
	}

	public getFilenameArg(startIndex: number): string | null {
		// Skips the directive token itself (at startIndex)
		const tokens = this.getInstructionTokens(startIndex);

		// Expects the structure: Directive Token, String Token
		if (tokens.length >= 2 && tokens[1].type === "STRING") {
			// The lexer now provides the un-escaped string value directly.
			return tokens[1].value;
		}
		return null;
	}

	private passOne(): void {
		this.logger.log(`\n--- Starting Pass 1: PASymbol Definition & PC Calculation (${this.cpuHandler.cpuType}) ---`);
		// Do not re-instantiate logger here, it resets the enabled state.
		this.currentPC = 0x0000;
		this.currentTokenIndex = 0;
		this.anonymousLabels = [];
		this.lastGlobalLabel = null;

		while (this.currentTokenIndex < this.activeTokens.length) {
			const token = this.activeTokens[this.currentTokenIndex];

			// Always update PC symbol before any instruction/data
			this.symbolTable.setSymbol("*", this.currentPC);

			switch (token.type) {
				case "DIRECTIVE": {
					const directiveContext = {
						token: token,
						tokenIndex: this.currentTokenIndex,
						evaluationContext: {
							pc: this.currentPC,
							allowForwardRef: true,
							currentGlobalLabel: this.lastGlobalLabel,
							options: this.options,
						},
					};

					const nextTokenIndex = this.directiveHandler.handlePassOneDirective(directiveContext);

					if (nextTokenIndex === ADVANCE_TO_NEXT_LINE)
						this.currentTokenIndex = this.skipToEndOfLine(this.currentTokenIndex);
					else this.currentTokenIndex = nextTokenIndex;
					break;
				}

				case "IDENTIFIER":
				case "LABEL": {
					// PRIORITY 1: SYMBOL ASSIGNMENT (IDENTIFIER .EQU VALUE)
					const nextToken = this.activeTokens[this.currentTokenIndex + 1];
					if (nextToken && (nextToken.value === ".EQU" || nextToken.value === "=" || nextToken.value === ":")) {
						this.handleLabelInPassOne(nextToken, token as ScalarToken);
						break;
					}

					// PRIORITY 2: MACRO
					if (this.macroDefinitions.has(token.value.toUpperCase())) {
						this.currentTokenIndex = this.skipToEndOfLine(this.currentTokenIndex);
						break;
					}

					this.handleInstructionPassOne(token as ScalarToken);
					break;
				}

				case "LOCAL_LABEL": {
					if (!this.lastGlobalLabel) {
						this.logger.error(
							`[PASS 1] ERROR on line ${token.line}: Local label ':${token.value}' defined without a preceding global label.`,
						);
					} else {
						const qualifiedName = `${this.lastGlobalLabel}.${token.value}`;
						this.symbolTable.addSymbol(qualifiedName, this.currentPC, false);
					}
					this.currentTokenIndex++;
					break;
				}

				case "ANONYMOUS_LABEL_DEF": {
					this.anonymousLabels.push(this.currentPC);
					this.currentTokenIndex++;
					break;
				}

				default:
					this.currentTokenIndex++;
			}
		}
	}

	private handleLabelInPassOne(nextToken: Token, token: ScalarToken): void {
		if (nextToken.value === ".EQU" || nextToken.value === "=") {
			const labelToken = token;
			// Start expression after .EQU or =
			const expressionTokens = this.getInstructionTokens(this.currentTokenIndex + 2);

			try {
				const value = this.expressionEvaluator.evaluate(expressionTokens, {
					pc: this.currentPC,
					allowForwardRef: true,
					currentGlobalLabel: this.lastGlobalLabel, // Added for .EQU
					options: this.options,
				});

				if (Array.isArray(value))
					this.logger.log(`[PASS 1] Defined array symbol ${labelToken.value} with ${value.length} elements.`);
				else this.logger.log(`[PASS 1] Defined symbol ${labelToken.value} = $${value.toString(16).toUpperCase()}`);

				this.symbolTable.addSymbol(labelToken.value, value);
			} catch (e) {
				this.logger.error(`[PASS 1] ERROR defining .EQU for ${labelToken.value}: ${e}`);
			}

			this.currentTokenIndex = this.skipToEndOfLine(this.currentTokenIndex);
			return;
		}

		if (nextToken.value === ":") {
			this.lastGlobalLabel = token.value;
			this.symbolTable.addSymbol(token.value, this.currentPC);
			this.logger.log(
				`[PASS 1] Defined label ${token.value} @ $${this.currentPC.toString(16).toUpperCase().padStart(4, "0")}`,
			);

			// Consume the label (IDENTIFIER) AND the colon (OPERATOR)
			this.currentTokenIndex += 2;
			// Then continue loop to process the instruction/directive that follows immediately
			return;
		}
	}

	private handleInstructionPassOne(token: ScalarToken): void {
		// Standard Instruction: Use the new mode resolver to calculate size
		const instructionTokens = this.getInstructionTokens(this.currentTokenIndex);
		const mnemonicToken = instructionTokens[0];
		const operandTokens = instructionTokens.slice(1);

		// A mnemonic must be a string. If it's an array, it's an error.
		if (typeof mnemonicToken.value !== "string") throw new Error("Invalid instruction: Mnemonic cannot be an array.");

		// Check if the mnemonic is a known instruction for the current CPU.
		if (this.cpuHandler.isInstruction(mnemonicToken.value)) {
			// It's an instruction. Resolve its size and advance the PC.
			try {
				const sizeInfo = this.cpuHandler.resolveAddressingMode(
					mnemonicToken.value,
					operandTokens as OperatorStackToken[],
					(exprTokens) =>
						this.expressionEvaluator.evaluateAsNumber(exprTokens, {
							pc: this.currentPC,
							allowForwardRef: true,
							currentGlobalLabel: this.lastGlobalLabel,
							options: this.options,
						}),
				);
				this.currentPC += sizeInfo.bytes;
			} catch (e) {
				const errorMessage = e instanceof Error ? e.message : String(e);
				this.logger.error(
					`[PASS 1] ERROR on line ${token.line}: Could not determine size of instruction '${mnemonicToken.value}'. ${errorMessage}`,
				);
				// In case of error, assume a default size to prevent cascading PC errors.
				// A better approach might be to halt or use a more intelligent guess.
				this.currentPC += 1;
			}
			this.currentTokenIndex = this.skipToEndOfLine(this.currentTokenIndex);
			return;
		}

		// It's not a known instruction, so treat it as a label definition.
		this.lastGlobalLabel = mnemonicToken.value;
		this.symbolTable.addSymbol(mnemonicToken.value, this.currentPC);
		this.logger.log(`[PASS 1] Defined label ${mnemonicToken.value} @ $${this.currentPC.toString(16).toUpperCase()}`);

		// Consume only the label token, and let the loop re-evaluate the next token (the instruction/directive)
		this.currentTokenIndex++;
	}

	private passTwo(): void {
		this.logger.log(`\n--- Starting Pass 2: Code Generation (${this.cpuHandler.cpuType}) ---`);
		this.symbolTable.setSymbol("*", this.currentPC);
		this.anonymousLabels = [];
		this.lastGlobalLabel = null;

		while (this.tokenStreamStack.length > 0) {
			if (this.currentTokenIndex >= this.activeTokens.length) {
				const poppedStream = this.popTokenStream(false); // Don't emit event yet

				// If we popped the last stream, we're done.
				if (this.tokenStreamStack.length === 0) break;

				// NOW that the parent stream is active, emit the event.
				if (poppedStream) this.emitter.emit(`endOfStream:${poppedStream.id}`);
				continue;
			}

			const token = this.activeTokens[this.currentTokenIndex];
			const instructionPC = this.currentPC;
			this.symbolTable.setSymbol("*", this.currentPC);

			switch (token.type) {
				case "IDENTIFIER": {
					const mnemonic = token.value.toUpperCase();

					// Skip Assignments - they were handled in Pass 1
					const nextToken = this.activeTokens[this.currentTokenIndex + 1];
					if (nextToken?.value === ".EQU" || nextToken?.value === "=") {
						this.currentTokenIndex = this.skipToEndOfLine(this.currentTokenIndex);
						continue;
					}

					if (this.macroDefinitions.has(mnemonic)) {
						// Macro expansion logic remains
						this.expandMacro(this.currentTokenIndex); // expandMacro now handles stream switching and index advancing.
						continue;
					}

					// Standard Instruction Encoding
					const instructionTokens = this.getInstructionTokens(this.currentTokenIndex) as OperatorStackToken[];
					const mnemonicToken = instructionTokens[0];
					const operandTokens = instructionTokens.slice(1) as OperatorStackToken[];

					if (this.isAssembling) {
						try {
							// 1. Resolve Mode & Address
							if (typeof mnemonicToken.value !== "string") {
								throw new Error("Invalid instruction: Mnemonic cannot be an array.");
							}
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
							const encodedBytes = this.cpuHandler.encodeInstruction(instructionTokens, {
								...modeInfo,
								pc: this.currentPC,
							});

							// 3. LOGGING (New location)
							const hexBytes = encodedBytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
							const addressHex = instructionPC.toString(16).padStart(4, "0").toUpperCase();

							const operandString = operandTokens.map((t) => t.value).join("");

							// This log output would typically be controlled by a directive like .LIST ON/OFF
							this.logger.log(
								`${addressHex}: ${hexBytes.padEnd(8)} | Line ${token.line}: ${mnemonicToken.value} ${operandString}`,
							);

							this.outputBuffer.push(...encodedBytes);
							this.currentPC += encodedBytes.length;
						} catch (e) {
							// Failure: Is it a label definition, or a bad instruction?
							const isLabel = this.symbolTable.lookupSymbol(mnemonicToken.value) !== undefined;

							if (isLabel) {
								// Case 1: It's a label definition (e.g., MyLoop:).
								// Consume only the label token, and let the loop handle the instruction on the next iteration.
								this.lastGlobalLabel = mnemonicToken.value;
								// console.log(`Skipping label token: ${mnemonicToken.value}.`);
								this.currentTokenIndex++;
								continue;
							}
							// Case 2: It is a genuine syntax/mnemonic error.
							const errorMessage = e instanceof Error ? e.message : String(e);
							this.logger.error(
								`\nFATAL ERROR on line ${token.line}: Invalid instruction mnemonic or unresolved symbol/syntax error. Error: ${errorMessage}`,
							);
							throw new Error(`Assembly failed on line ${token.line}: ${errorMessage}`); // Stop execution
							// this.currentPC += this.getInstructionSize(token.value, this.currentTokenIndex);
						}
					} else {
						// Not assembling: just advance PC
						this.currentPC += this.getInstructionSize(this.currentTokenIndex);
					}
					this.currentTokenIndex = this.skipToEndOfLine(this.currentTokenIndex);

					continue;
				}

				case "DIRECTIVE": {
					const streamBefore = this.tokenStreamStack.length;
					const directiveContext = {
						token: token,
						tokenIndex: this.currentTokenIndex,
						evaluationContext: {
							pc: this.currentPC,
							macroArgs: this.tokenStreamStack[this.tokenStreamStack.length - 1].macroArgs,
							assembler: this,
							currentGlobalLabel: this.lastGlobalLabel,
							options: this.options,
						},
					};
					const nextTokenIndex = this.directiveHandler.handlePassTwoDirective(directiveContext);

					if (this.tokenStreamStack.length > streamBefore) {
						// A new stream was pushed. The active context has changed, so we must start at its beginning.
						this.currentTokenIndex = 0;
						break;
					}
					if (nextTokenIndex === ADVANCE_TO_NEXT_LINE) {
						// Directive requested default "next line" behavior.
						this.currentTokenIndex = this.skipToEndOfLine(this.currentTokenIndex);
					} else {
						// Directive is a block and has returned the exact index to continue from.
						this.currentTokenIndex = nextTokenIndex;
					}
					break;
				}

				case "LABEL":
					this.lastGlobalLabel = token.value;
					this.currentTokenIndex++;
					break;
				// This is a definition, already handled in Pass 1. Just skip it.
				// case "LOCAL_LABEL":
				// 	this.currentTokenIndex++;
				// 	break;
				case "ANONYMOUS_LABEL_DEF":
					this.anonymousLabels.push(this.currentPC);
					this.currentTokenIndex++;
					break;

				default:
					this.currentTokenIndex++;
			}
		}
	}

	/** Returns the ID that will be used for the next stream. */
	public getNextStreamId(): number {
		return this.streamIdCounter + 1;
	}

	/** Pushes the current stream state and activates a new stream (macro/loop body). */
	public pushTokenStream(newTokens: Token[], macroArgs?: Map<string, Token[]>, streamId?: number): number {
		// Save current position and arguments
		this.tokenStreamStack[this.tokenStreamStack.length - 1].index = this.currentTokenIndex;

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
		this.currentTokenIndex = 0;
		return newStreamId;
	}

	/** Restores the previous stream state after a macro/loop finishes. */
	private popTokenStream(emitEvent = true): StreamState | undefined {
		const poppedStream = this.tokenStreamStack.pop();
		if (poppedStream && emitEvent) this.emitter.emit(`endOfStream:${poppedStream.id}`);

		if (this.tokenStreamStack.length > 0) {
			const previousState = this.tokenStreamStack[this.tokenStreamStack.length - 1];
			this.activeTokens = previousState.tokens;
			this.currentTokenIndex = previousState.index;
		}
		return poppedStream;
	}

	/** Pass 2: Expands a macro by injecting its tokens into the stream with argument substitution. */
	private expandMacro(callIndex: number): void {
		const nameToken = this.activeTokens[callIndex] as OperatorStackToken; // Macro name is the current token
		const macroName = nameToken.value.toUpperCase();
		const definition = this.macroDefinitions.get(macroName);

		if (!definition) {
			console.error(`ERROR: Macro '${macroName}' not defined.`);
			return;
		}

		this.logger.log(`[PASS 2] Expanding macro: ${macroName}`);

		// 1. Parse arguments passed in the call line
		const passedArgsArray = this.parseMacroArguments(callIndex + 1);
		const argMap = new Map<string, Token[]>();

		// 2. Map parameter names to argument tokens
		definition.parameters.forEach((param, index) => {
			// Provide a default empty token array if argument is missing
			const argTokens = passedArgsArray[index] || [];
			argMap.set(param.toUpperCase(), argTokens);
		});

		// 3. Substitute parameters in the macro body
		const expandedTokens = definition.body.map((bodyToken) => {
			const newBodyToken = { ...bodyToken, line: `${nameToken.line}.${bodyToken.line}` };

			// Only perform substitution on tokens that have a string value.
			if (typeof newBodyToken.value === "string") {
				// Use a regex to find all instances of {param} and replace them.
				// The callback function allows us to evaluate each parameter dynamically.
				newBodyToken.value = newBodyToken.value.replace(/{([a-zA-Z0-9_]+)}/g, (match, paramName) => {
					const upperParamName = paramName.toUpperCase();
					const argTokens = argMap.get(upperParamName);
					if (argTokens) {
						// Evaluate the argument tokens passed to the macro.
						// This allows DEFINE_DATA_BLOCK(1, ...) where '1' is the value for 'id'.
						// If the argument is a string literal, return its content without quotes.
						if (argTokens.length === 1 && argTokens[0].type === "STRING") {
							return argTokens[0].value.slice(1, -1); // Remove quotes
						}
						// Otherwise, evaluate it as an expression.
						const paramValue = this.expressionEvaluator.evaluate(argTokens, {
							pc: this.currentPC,
							macroArgs: argMap,
							currentGlobalLabel: this.lastGlobalLabel, // Added for macro arg evaluation
							options: this.options,
						});
						return String(paramValue);
					}
					// If the parameter is not found, return the original match (e.g., "{id}")
					return match;
				});
			}

			return newBodyToken;
		});

		// 4. Push the new stream and execute
		// We must also advance the token pointer on the *current* stream past the macro call line
		// before pushing the new stream.
		this.currentTokenIndex = this.skipToEndOfLine(callIndex);
		this.pushTokenStream(expandedTokens, argMap);
	}

	/** Parses argument tokens from the call line, starting after the macro name. */
	private parseMacroArguments(startIndex: number): Token[][] {
		const callLine = this.activeTokens[startIndex - 1].line;
		const argsArray: Token[][] = [];

		let currentArgTokens: Token[] = [];

		// Determine the range of tokens to scan for arguments
		let scanStartIndex = startIndex;
		let scanEndIndex = this.skipToEndOfLine(startIndex - 1); // End of the macro call line

		// Check if the arguments are wrapped in parentheses, e.g., MACRO(arg1, arg2)
		const firstToken = this.activeTokens[startIndex];
		if (firstToken && firstToken.line === callLine && firstToken.value === "(") {
			// Find the matching closing parenthesis on the same line
			let parenDepth = 1;
			for (let i = startIndex + 1; i < scanEndIndex; i++) {
				const token = this.activeTokens[i];
				if (token.value === "(") parenDepth++;
				if (token.value === ")") parenDepth--;
				if (parenDepth === 0) {
					scanEndIndex = i; // The closing ')' is the end of our argument list
					break;
				}
			}
			scanStartIndex++; // Start scanning after the opening '('
		}

		// Now, scan only the tokens that constitute the arguments
		let parenDepth = 0;
		for (let i = scanStartIndex; i < scanEndIndex; i++) {
			const token = this.activeTokens[i];

			// A comma at the root level (not inside any parentheses) separates arguments.
			if (token.type === "COMMA" && parenDepth === 0) {
				if (currentArgTokens.length > 0) {
					argsArray.push(currentArgTokens);
					currentArgTokens = [];
				}
			} else {
				// This token is part of the current argument. Track nested parentheses.
				if (token.value === "(") parenDepth++;
				if (token.value === ")") parenDepth--;
				currentArgTokens.push(token);
			}
		}

		// Add the last (or only) argument to the map.
		if (currentArgTokens.length > 0) {
			argsArray.push(currentArgTokens);
		}

		return argsArray;
	}

	public getInstructionTokens(startIndex: number): Token[] {
		const tokens: Token[] = [];
		let i = startIndex;
		const startLine = startIndex < this.activeTokens.length ? this.activeTokens[startIndex].line : -1;

		while (i < this.activeTokens.length && this.activeTokens[i].line === startLine) {
			const token = this.activeTokens[i];
			// Stop if we hit a block delimiter, as it's not part of the instruction/expression.
			if (token.type === "LBRACE" || token.type === "RBRACE") {
				break;
			}
			tokens.push(token);
			i++;
		}
		return tokens;
	}

	public skipToEndOfLine(startIndex: number): number {
		const startLine = this.activeTokens[startIndex].line;
		let i = startIndex + 1;
		while (i < this.activeTokens.length && this.activeTokens[i].line === startLine) {
			i++;
		}
		return i;
	}

	/** * Finds the token index of the matching block-ending structure ('.END' or '}')
	 * for the starting block (directive or '{'). Accepts both typed block tokens
	 * and plain '{' / '}' operator tokens emitted by the tokenizer.
	 */
	public findMatchingDirective(startIndex: number): number {
		let depth = 1; // Start at depth 1 for the initial block.
		const startToken = this.activeTokens[startIndex] as ScalarToken;
		const startDirective = startToken.value.toUpperCase();

		for (let i = startIndex + 1; i < this.activeTokens.length; i++) {
			const token = this.activeTokens[i] as ScalarToken;
			const tokenValue = token.value?.toUpperCase() ?? "";

			// Increase depth for nested same directives (.MACRO/.FOR/.REPEAT etc)
			if ((token.type === "DIRECTIVE" && tokenValue === startDirective) || token.value === "{") {
				depth++;
			}

			// Decrease on .END or explicit block end '}' (or token types)
			if ((token.type === "DIRECTIVE" && tokenValue === ".END") || token.value === "}") {
				depth--;
				if (depth === 0) {
					return i; // Found the matching end.
				}
			}
		}

		// Not found
		return this.activeTokens.length;
	}

	public getInstructionSize(startIndex: number): number {
		try {
			const instructionTokens = this.getInstructionTokens(startIndex);
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
		} catch (e) {
			return this.cpuHandler.cpuType === "ARM_RISC" ? 4 : 3; // Robust default based on CPU type
		}
	}

	public handlePASymbolDefinition(startIndex: number): void {
		const symbolToken = this.activeTokens[startIndex] as ScalarToken;

		// Start after symbol and '=' (or simply start after the symbol token)
		const expressionStart = startIndex + 2;
		const expressionTokens = this.getInstructionTokens(expressionStart);

		try {
			const value = this.expressionEvaluator.evaluate(expressionTokens, {
				pc: this.currentPC,
				allowForwardRef: true,
				options: this.options,
				currentGlobalLabel: this.lastGlobalLabel, // Added for symbol definition
			});
			this.symbolTable.addSymbol(symbolToken.value, value, true);
		} catch (e) {
			this.logger.error(
				`[PASS 1] ERROR on line ${symbolToken.line}: Failed to evaluate expression for symbol ${symbolToken.value}. ${e}`,
			);
			// Fallback to 0 if expression evaluation fails in Pass 1
			this.symbolTable.addSymbol(symbolToken.value, 0, true);
		}
	}
}
