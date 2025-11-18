import type { OperatorStackToken, Token } from "../../lexer/lexer.class";
import type { Logger } from "../../logger";
import type { Assembler } from "../../polyasm";

export class MacroHandler {
	private assembler: Assembler;
	private logger: Logger;

	constructor(assembler: Assembler, logger: Logger) {
		this.assembler = assembler;
		this.logger = logger;
	}

	public isMacro(name: string): boolean {
		return this.assembler.macroDefinitions.has(name.toUpperCase());
	}

	/** Pass 2: Expands a macro by injecting its tokens into the stream with argument substitution. */
	public expandMacro(callIndex: number): void {
		const nameToken = this.assembler.activeTokens[callIndex] as OperatorStackToken; // Macro name is the current token
		const macroName = nameToken.value.toUpperCase();
		const definition = this.assembler.macroDefinitions.get(macroName);

		if (!definition) {
			console.error(`ERROR: Macro '${macroName}' not defined.`);
			return;
		}

		this.logger.log(`[PASS 2] Expanding macro: ${macroName}`);

		// 1. Parse arguments passed in the call line
		const passedArgsArray = this.parseMacroArguments(this.getArgumentTokens(callIndex));

		// Check for argument count mismatch
		if (passedArgsArray.length > definition.parameters.length) {
			throw new Error(
				`[PASS 2] Too many arguments for macro '${macroName}' on line ${nameToken.line}. Expected ${definition.parameters.length}, but got ${passedArgsArray.length}.`,
			);
		}

		const argMap = new Map<string, Token[]>();

		// 2. Push a new scope for the macro and define parameters as symbols.
		// The scope will be popped automatically when the macro stream ends.
		const scopeName = `__MACRO_${macroName}_${nameToken.line}__`;
		this.assembler.symbolTable.pushScope(scopeName);

		definition.parameters.forEach((param, index) => {
			const argTokens = passedArgsArray[index] || [];
			// Define the parameter as a symbol within the new scope. Its value is the token array.
			argMap.set(param.toUpperCase(), argTokens);
		});

		// 3. Create a clean copy of the body tokens with updated line numbers.
		const expandedTokens = definition.body.map((bodyToken) => ({
			...bodyToken,
			line: `${nameToken.line}.${bodyToken.line}`,
		}));

		// 4. Push the new stream and execute.
		// We must also advance the token pointer on the *current* stream past the macro call line
		// before pushing the new stream.
		this.assembler.currentTokenIndex = this.assembler.skipToEndOfLine(callIndex);
		this.assembler.pushTokenStream(expandedTokens, argMap);
	}

	/**
	 * Extracts the list of tokens that constitute the arguments for a macro call.
	 * It handles both `MACRO arg1, arg2` and `MACRO(arg1, arg2)` syntax.
	 * @param callIndex The index of the macro name token.
	 * @returns A slice of tokens representing the arguments.
	 */
	private getArgumentTokens(callIndex: number): Token[] {
		const callLine = this.assembler.activeTokens[callIndex].line;
		const lineEndIndex = this.assembler.skipToEndOfLine(callIndex);
		const startIndex = callIndex + 1;

		// Check for arguments wrapped in parentheses, e.g., MACRO(arg1, arg2)
		const firstToken = this.assembler.activeTokens[startIndex];
		if (firstToken && firstToken.line === callLine && firstToken.value === "(") {
			let parenDepth = 1;
			for (let i = startIndex + 1; i < lineEndIndex; i++) {
				const token = this.assembler.activeTokens[i];
				if (token.value === "(") parenDepth++;
				if (token.value === ")") parenDepth--;
				if (parenDepth === 0) {
					// Return tokens between the parentheses
					return this.assembler.activeTokens.slice(startIndex + 1, i);
				}
			}
		}

		// No parentheses, arguments are the rest of the tokens on the line
		return this.assembler.activeTokens.slice(startIndex, lineEndIndex);
	}

	/**
	 * Parses a list of argument tokens into a list of token arrays, one for each argument.
	 * This method correctly handles empty arguments (e.g., `arg1,,arg3`).
	 * @param argTokens The tokens to parse.
	 */
	private parseMacroArguments(argTokens: Token[]): Token[][] {
		const argsArray: Token[][] = [];
		let currentArgTokens: Token[] = [];
		let parenDepth = 0;

		for (const token of argTokens) {
			if (token.type === "COMMA" && parenDepth === 0) {
				argsArray.push(currentArgTokens);
				currentArgTokens = [];
			} else {
				if (token.value === "(") parenDepth++;
				if (token.value === ")") parenDepth--;
				currentArgTokens.push(token);
			}
		}
		argsArray.push(currentArgTokens); // Add the last argument

		// If the original tokens were empty, or if the only argument found is empty,
		// it means there were no actual arguments.
		if (argTokens.length === 0 && argsArray.length === 1 && argsArray[0].length === 0) {
			return [];
		}
		return argsArray;
	}
}
