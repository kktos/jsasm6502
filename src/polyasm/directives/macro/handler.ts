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
							return argTokens[0].value; // The lexer already provides the clean string
						}
						// Otherwise, evaluate it as an expression.
						const paramValue = this.assembler.expressionEvaluator.evaluate(argTokens, {
							pc: this.assembler.currentPC,
							macroArgs: argMap,
							currentGlobalLabel: this.assembler.getLastGlobalLabel(),
							options: this.assembler.options,
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
		this.assembler.currentTokenIndex = this.assembler.skipToEndOfLine(callIndex);
		this.assembler.pushTokenStream(expandedTokens, argMap);
	}

	/** Parses argument tokens from the call line, starting after the macro name. */
	private parseMacroArguments(startIndex: number): Token[][] {
		const callLine = this.assembler.activeTokens[startIndex - 1].line;
		const argsArray: Token[][] = [];

		let currentArgTokens: Token[] = [];

		// Determine the range of tokens to scan for arguments
		let scanStartIndex = startIndex;
		let scanEndIndex = this.assembler.skipToEndOfLine(startIndex - 1); // End of the macro call line

		// Check if the arguments are wrapped in parentheses, e.g., MACRO(arg1, arg2)
		const firstToken = this.assembler.activeTokens[startIndex];
		if (firstToken && firstToken.line === callLine && firstToken.value === "(") {
			// Find the matching closing parenthesis on the same line
			let parenDepth = 1;
			for (let i = startIndex + 1; i < scanEndIndex; i++) {
				const token = this.assembler.activeTokens[i];
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
			const token = this.assembler.activeTokens[i];

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
}
