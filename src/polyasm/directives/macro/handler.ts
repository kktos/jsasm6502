import type { ScalarToken, Token } from "../../lexer/lexer.class";
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
		return this.assembler.macroDefinitions.has(name);
	}

	/** Pass 2: Expands a macro by injecting its tokens into the stream with argument substitution. */
	public expandMacro(macroToken: ScalarToken) {
		const macroName = macroToken.value;
		const definition = this.assembler.macroDefinitions.get(macroName);

		if (!definition) throw new Error(`[PASS 2] ERROR: Macro '${macroName}' not defined.`);

		this.logger.log(`[PASS 2] Expanding macro: ${macroName}`);

		// 1. Parse arguments passed in the call line
		const passedArgsArray = this.parseMacroArguments(macroToken.line);

		// Check for argument count mismatch
		if (passedArgsArray.length > definition.parameters.length)
			throw new Error(
				`[PASS 2] Too many arguments for macro '${macroName}' on line ${macroToken.line}. Expected ${definition.parameters.length}, but got ${passedArgsArray.length}.`,
			);

		const argMap = new Map<string, Token[]>();

		// 2. Push a new scope for the macro and define parameters as symbols.
		// The scope will be popped automatically when the macro stream ends.
		const scopeName = `__MACRO_${macroName}_${macroToken.line}__`;
		this.assembler.symbolTable.pushScope(scopeName);

		definition.parameters.forEach((param, index) => {
			const argTokens = passedArgsArray[index] || [];
			// Define the parameter as a symbol within the new scope. Its value is the token array.
			argMap.set(param.toUpperCase(), argTokens);
		});

		// 3. Create a clean copy of the body tokens with updated line numbers.
		const expandedTokens = definition.body.map((bodyToken) => ({
			...bodyToken,
			line: `${macroToken.line}.${bodyToken.line}`,
		}));

		// 4. Advance the current stream past the macro call line and push the new stream.
		// this.assembler.consumeLine();
		this.assembler.pushTokenStream(expandedTokens, argMap);
	}

	/**
	 * Parses a list of argument tokens into a list of token arrays, one for each argument.
	 * This method correctly handles empty arguments (e.g., `arg1,,arg3`).
	 * @param argTokens The tokens to parse.
	 */
	private parseMacroArguments(callLine?: string | number): Token[][] {
		const argsArray: Token[][] = [];
		let currentArgTokens: Token[] = [];
		let parenDepth = 0;

		const firstPeek = this.assembler.peekToken();
		if (!firstPeek || firstPeek.type === "EOF") return [];
		const hasParens = firstPeek.value === "(";
		const callLineNum = callLine ?? firstPeek.line;

		if (hasParens) {
			// consume opening '('
			this.assembler.consume(1);
			parenDepth = 1;
			while (true) {
				const token = this.assembler.peekToken();
				if (!token || token.type === "EOF") break;
				this.assembler.consume(1);

				if (token.value === "(") {
					parenDepth++;
					currentArgTokens.push(token);
					continue;
				}

				if (token.value === ")") {
					parenDepth--;
					if (parenDepth === 0) {
						argsArray.push(currentArgTokens);
						currentArgTokens = [];
						break; // finished argument list
					}
					currentArgTokens.push(token);
					continue;
				}

				if (token.type === "COMMA" && parenDepth === 1) {
					argsArray.push(currentArgTokens);
					currentArgTokens = [];
					continue;
				}

				currentArgTokens.push(token);
			}
		} else {
			// No parentheses: only take tokens on the same line as the macro call
			while (true) {
				const token = this.assembler.peekToken();
				if (!token || token.type === "EOF" || token.line !== callLineNum) break;
				this.assembler.consume(1);
				if (token.type === "COMMA") {
					argsArray.push(currentArgTokens);
					currentArgTokens = [];
				} else {
					currentArgTokens.push(token);
				}
			}
			if (currentArgTokens.length > 0) argsArray.push(currentArgTokens);
		}

		// If the original tokens were empty, or if the only argument found is empty,
		// it means there were no actual arguments.
		if (argsArray.length === 1 && argsArray[0].length === 0) return [];

		return argsArray;
	}
}
