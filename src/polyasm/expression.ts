/**
 * expression.ts
 * * Defines the expression evaluation engine for the assembler.
 * * Uses the Shunting-Yard algorithm for precedence and parentheses.
 */

import type { Token } from "./lexer/lexer.class";
import type { PASymbolTable, SymbolValue } from "./symbol.class";
import type { Assembler } from "./polyasm";
import type { Logger } from "./logger";
import { functionDispatcher } from "./functions/dispatcher";

const PRECEDENCE: Record<string, number> = {
	// Unary operators (highest precedence)
	UNARY_MINUS: 9,
	"!": 9,
	UNARY_MSB: 9,
	UNARY_LSB: 9,

	// High precedence for array indexing
	ARRAY_ACCESS: 9,

	// Multiplicative
	"*": 8,
	"/": 8,
	"%": 8,

	// Additive
	"+": 7,
	"-": 7,

	// Bitwise shifts
	"<<": 6,
	">>": 6,

	// Relational
	"<": 5,
	">": 5,
	"<=": 5,
	">=": 5,

	// Equality
	"=": 4,
	"==": 4,
	"!=": 4,

	// Bitwise AND
	"&": 3,

	// Logical AND
	"&&": 2,

	// Bitwise XOR
	"^": 1,

	// Bitwise OR / Logical OR (lowest precedence)
	"|": 0,
	"||": 0,
};

/**
 * Provides the context needed for the expression evaluator to resolve symbols
 * and the current program counter.
 */
export interface EvaluationContext {
	symbolTable: PASymbolTable;
	assembler?: Assembler;
	pc: number;
	macroArgs?: Map<string, Token[]>;
	allowForwardRef?: boolean;
	currentGlobalLabel?: string | null;
	options?: Map<string, string>;
}

export class ExpressionEvaluator {
	private symbolTable: PASymbolTable;
	private logger: Logger;

	constructor(symbolTable: PASymbolTable, logger: Logger) {
		this.symbolTable = symbolTable;
		this.logger = logger;
	}

	/**
	 * Resolves an array of tokens into a single numeric value using the
	 * Shunting-Yard algorithm for precedence and RPN evaluation.
	 */
	public evaluate(tokens: Token[], context: Omit<EvaluationContext, "symbolTable">): SymbolValue {
		if (tokens.length === 0) return 0;

		const rpnTokens = this.infixToRPN(tokens, context);
		return this.evaluateRPN(rpnTokens, context);
	}

	/**
	 * A wrapper for evaluate that ensures the result is a number.
	 * Throws an error if the expression evaluates to a string or array.
	 */
	public evaluateAsNumber(tokens: Token[], context: Omit<EvaluationContext, "symbolTable">): number {
		const result = this.evaluate(tokens, context);
		if (typeof result !== "number") {
			throw new Error("Expression did not evaluate to a number as expected.");
		}
		return result;
	}

	/**
	 * Evaluates the contents of an array literal.
	 * e.g., [ "red", "green", 1+2 ]
	 */
	private evaluateArray(tokens: Token[], context: Omit<EvaluationContext, "symbolTable">): SymbolValue {
		const elements: (string | number)[] = [];
		let currentExpression: Token[] = [];

		const evaluateAndPush = () => {
			if (currentExpression.length > 0) {
				const result = this.evaluate(currentExpression, context);
				if (Array.isArray(result)) {
					throw new Error("Nested arrays are not supported.");
				}
				elements.push(result);
				currentExpression = [];
			}
		};

		for (const token of tokens) {
			if (token.type === "COMMA") {
				evaluateAndPush();
			} else {
				currentExpression.push(token);
			}
		}
		evaluateAndPush(); // Push the last element
		return elements;
	}

	/** Converts an infix token stream to Reverse Polish Notation (RPN). */

	private infixToRPN(tokens: Token[], context: Omit<EvaluationContext, "symbolTable">) {
		const outputQueue: Token[] = [];
		const operatorStack: Token[] = [];
		let lastToken: Token | undefined;

		for (let i = 0; i < tokens.length; i++) {
			let processedToken = tokens[i]; // Use a mutable token for processing

			// --- Array Literal Parsing (only if not preceded by an operand) ---
			// This block handles `[1,2,3]`
			const isPrecededByOperand =
				lastToken &&
				(lastToken.type === "NUMBER" ||
					lastToken.type === "STRING" ||
					lastToken.type === "IDENTIFIER" ||
					lastToken.type === "LABEL" ||
					lastToken.type === "LOCAL_LABEL" ||
					lastToken.type === "ANONYMOUS_LABEL_REF" ||
					lastToken.type === "ARRAY" ||
					lastToken.value === ")"); // closing parenthesis of a sub-expression or array access

			if (processedToken.value === "[" && !isPrecededByOperand) {
				// Array literal detection
				let balance = 1;
				let j = i + 1;
				for (; j < tokens.length; j++) {
					if (tokens[j].value === "[") balance++;
					if (tokens[j].value === "]") balance--;
					if (balance === 0) break;
				}

				if (balance !== 0) {
					throw new Error(`Mismatched brackets in array literal on line ${processedToken.line}.`);
				}

				const arrayContentTokens = tokens.slice(i + 1, j);
				const arrayValue = this.evaluateArray(arrayContentTokens, context);
				const arrayToken: Token = {
					type: "ARRAY",
					value: JSON.stringify(arrayValue),
					line: processedToken.line,
					column: processedToken.column,
				};
				outputQueue.push(arrayToken);
				i = j; // Move index past the array
				lastToken = arrayToken;
				continue;
			}
			switch (processedToken.type) {
				case "NUMBER":
				case "STRING":
				case "IDENTIFIER":
				case "LABEL":
				case "LOCAL_LABEL":
				case "ANONYMOUS_LABEL_REF":
				case "ARRAY":
					// Check for function call
					if (processedToken.type === "IDENTIFIER" && tokens[i + 1]?.value === "(") {
						const funcToken: Token = {
							...processedToken,
							type: "FUNCTION",
							value: `${processedToken.value},1`, // Store arg count, default to 1
						};
						operatorStack.push(funcToken);
						lastToken = funcToken;
						continue; // Skip to next token
					}

					// An operand should not follow another operand without an operator in between.
					if (lastToken && lastToken.type !== "OPERATOR" && lastToken.type !== "COMMA" && lastToken.value !== "(") {
						throw new Error(
							`Invalid expression format: Unexpected token '${processedToken.value}' on line ${processedToken.line}.`,
						);
					}
					outputQueue.push(processedToken);
					break;

				case "COMMA": {
					// A comma acts as a separator between expressions in a function call.
					// We need to evaluate everything on the operator stack until we find the
					// opening parenthesis of the function call.
					while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].value !== "(") {
						outputQueue.push(operatorStack.pop() as Token);
					}

					// Commas are only valid inside function calls.
					let foundParen = false;
					for (let k = operatorStack.length - 1; k >= 0; k--) {
						if (operatorStack[k].value === "(") {
							foundParen = true;
							// Increment argument count of the function, which is right before the '('
							if (k > 0 && operatorStack[k - 1].type === "FUNCTION") {
								const [name, count] = operatorStack[k - 1].value.split(",");
								operatorStack[k - 1].value = `${name},${Number.parseInt(count) + 1}`;
							}
							break;
						}
					}
					if (!foundParen) throw new Error(`Unexpected comma on line ${processedToken.line}.`);
					// Treat comma like an operator for lastToken tracking
					break;
				} // No fall-through here, as COMMA is now explicitly handled in the operand check.

				case "OPERATOR": {
					const op = processedToken.value;
					const isUnary =
						!lastToken || lastToken.value === "(" || (lastToken.type === "OPERATOR" && lastToken.value !== ")");

					switch (op) {
						case "[": // This is now specifically for array access, as array literals are handled above
							// Push ARRAY_ACCESS as an operator, then push '(' to handle the index expression
							operatorStack.push({ ...processedToken, value: "ARRAY_ACCESS" }); // Push the special operator
							operatorStack.push({ ...processedToken, value: "(" }); // Push a virtual '(' for the index expression
							break;

						case "]": {
							// Closing bracket for array access
							let foundOpeningParenForIndex = false;
							while (operatorStack.length > 0) {
								const topOp = operatorStack.pop() as Token;
								if (topOp.value === "(") {
									// Found the virtual '(' for the index
									foundOpeningParenForIndex = true;
									break;
								}
								outputQueue.push(topOp);
							}
							if (!foundOpeningParenForIndex) {
								throw new Error(`Mismatched brackets: unmatched ']' on line ${processedToken.line}.`);
							}
							// Now, the operatorStack should have the ARRAY_ACCESS operator
							const arrayAccessOp = operatorStack.pop();
							if (arrayAccessOp?.value !== "ARRAY_ACCESS") {
								throw new Error(
									`Mismatched brackets: ']' without preceding array access on line ${processedToken.line}.`,
								);
							}
							outputQueue.push(arrayAccessOp); // Push ARRAY_ACCESS to output queue
							break;
						}

						case "-":
						case "+":
							if (isUnary) {
								const unaryToken: Token = {
									type: "OPERATOR",
									value: "UNARY_MINUS",
									line: processedToken.line,
									column: processedToken.column,
								};
								if (op === "-") {
									this.pushOperatorWithPrecedence(unaryToken, outputQueue, operatorStack);
								} // Unary '+' is a no-op, so we do nothing and don't update lastToken.
							} else {
								// It's a binary operator
								this.pushOperatorWithPrecedence(processedToken, outputQueue, operatorStack);
							}
							break;

						case "!":
							if (!isUnary) {
								throw new Error(`Operator '!' must be unary on line ${processedToken.line}.`);
							}
							this.pushOperatorWithPrecedence(processedToken, outputQueue, operatorStack);
							break;

						case "*":
							if (isUnary) {
								// This is the program counter symbol, not multiplication.
								// Treat it as an identifier.
								processedToken = { ...processedToken, type: "IDENTIFIER" };
								outputQueue.push(processedToken);
							} else this.pushOperatorWithPrecedence(processedToken, outputQueue, operatorStack);
							break;

						case "/":
						case "&":
						case "|":
						case "^":
						case "=":
						case "==":
						case "!=":
						case "<":
						case ">":
						case "<=":
						case ">=":
						case "%":
						case "&&":
						case "||":
						case "<<":
						case ">>":
							this.pushOperatorWithPrecedence(processedToken, outputQueue, operatorStack);
							break;

						case "(":
							operatorStack.push(processedToken);
							break;

						case ")": {
							let foundMatch = false;
							while (operatorStack.length > 0) {
								const topOp = operatorStack.pop() as Token;
								if (topOp.value === "(") {
									foundMatch = true;
									break;
								}
								outputQueue.push(topOp);
							}
							if (!foundMatch) {
								throw new Error(`Mismatched parenthesis: unmatched ')' on line ${processedToken.line}.`);
							}
							// If the token before the '(' was a function, pop it onto the output queue.
							const topOfStack = operatorStack[operatorStack.length - 1];
							if (topOfStack?.type === "FUNCTION") {
								const funcToken = operatorStack.pop() as Token;
								const [name, count] = funcToken.value.split(",");
								// If there's only one argument and it's empty (e.g., .FOO()), arg count is 0.
								if (Number.parseInt(count) === 1 && lastToken?.value === "(") funcToken.value = `${name},0`;
								outputQueue.push(funcToken);
							}
							break;
						}
					}
				}
			}
			lastToken = processedToken; // Always update lastToken
		}

		while (operatorStack.length > 0) {
			const op = operatorStack.pop() as Token;
			if (op.value === "(" || op.value === ")") {
				throw new Error(`Mismatched parenthesis: unmatched '(' left in stack.`);
			}
			outputQueue.push(op);
		}

		return outputQueue;
	}

	/** Helper function to handle operator precedence during Shunting-Yard. */
	private pushOperatorWithPrecedence(token: Token, outputQueue: Token[], operatorStack: Token[]): void {
		const currentPrecedence = PRECEDENCE[token.value] ?? 0;

		while (operatorStack.length > 0) {
			const topOp = operatorStack[operatorStack.length - 1];
			if (topOp.value === "(") break;

			const topPrecedence = PRECEDENCE[topOp.value] ?? 0;

			if (topPrecedence >= currentPrecedence) {
				outputQueue.push(operatorStack.pop() as Token);
			} else {
				break;
			}
		}
		operatorStack.push(token);
	}

	/** Evaluates a Reverse Polish Notation (RPN) token stream. */
	private evaluateRPN(rpnTokens: Token[], context: Omit<EvaluationContext, "symbolTable">): SymbolValue {
		const stack: SymbolValue[] = [];

		for (const token of rpnTokens) {
			switch (token.type) {
				case "NUMBER":
					stack.push(this.parseNumericArg(token));
					break;

				case "STRING":
					stack.push(token.value);
					break;

				case "ARRAY":
					// The value is a JSON stringified array from infixToRPN
					stack.push(JSON.parse(token.value));
					break;

				case "IDENTIFIER":
				case "LABEL":
				case "LOCAL_LABEL":
				case "ANONYMOUS_LABEL_REF": {
					const value = this.resolveValue(token, context);
					if (value !== undefined) {
						stack.push(value);
						break;
					}

					// This part handles macro argument substitution where the argument itself is an expression
					// This needs to be evaluated before being pushed to the stack.
					const argTokens = context.macroArgs?.get(token.value.toUpperCase());
					if (argTokens) {
						const result = this.evaluate(argTokens, context);
						if (result !== undefined) {
							stack.push(result);
						} else {
							// This case would be for array arguments, which can't be pushed onto the numeric stack.
							// The logic should handle this based on where the macro is used.
						}
					}

					break;
				}

				case "FUNCTION": {
					const [funcName, argCountStr] = token.value.split(",");
					const argCount = Number.parseInt(argCountStr);
					functionDispatcher(funcName.toUpperCase(), stack, token, this.symbolTable, argCount);
					break;
				}

				case "OPERATOR": {
					const right = stack.pop();

					if (token.value === "UNARY_MINUS") {
						if (typeof right !== "number") throw new Error("Unary operator requires a numeric operand.");
						stack.push(-right);
						break;
					}
					if (token.value === "!") {
						if (typeof right !== "number") throw new Error("Unary operator '!' requires a numeric operand.");
						stack.push(right === 0 ? 1 : 0);
						break;
					}

					if (token.value === "ARRAY_ACCESS") {
						if (typeof right !== "number") {
							throw new Error(`Array index must be a number on line ${token.line}.`);
						}
						const array = stack.pop();
						if (!Array.isArray(array)) {
							throw new Error(`Attempted to index a non-array value on line ${token.line}.`);
						}
						if (right < 0 || right >= array.length) {
							throw new Error(
								`Array index ${right} out of bounds for array of length ${array.length} on line ${token.line}.`,
							);
						}
						stack.push(array[right]);
						break;
					}

					const left = stack.pop();
					if (left === undefined || right === undefined)
						throw new Error(`Binary operator '${token.value}' requires two operands.`);

					if (typeof left === "string" && typeof right === "string") {
						switch (token.value) {
							case "+":
								stack.push(left + right);
								break;

							case "=":
							case "==":
								stack.push(left === right ? 1 : 0);
								break;

							case "!=":
								stack.push(left !== right ? 1 : 0);
								break;
							default:
								throw new Error(`Unknown operator: ${token.value}`);
						}
						break;
					}

					if (typeof left !== "number" || typeof right !== "number") {
						throw new Error(`Operands for '${token.value}' must be numeric.`);
					}

					switch (token.value) {
						case "=":
						case "==":
							stack.push(left === right ? 1 : 0);
							break;

						case "!=":
							stack.push(left !== right ? 1 : 0);
							break;

						case "<":
							stack.push(left < right ? 1 : 0);
							break;
						case ">":
							stack.push(left > right ? 1 : 0);
							break;
						case "<=":
							stack.push(left <= right ? 1 : 0);
							break;
						case ">=":
							stack.push(left >= right ? 1 : 0);
							break;

						case "+":
							stack.push(left + right);
							break;
						case "-":
							stack.push(left - right);
							break;
						case "*":
							stack.push(left * right);
							break;
						case "/":
							if (right === 0) throw new Error("Division by zero.");
							stack.push(Math.floor(left / right)); // Integer division
							break;
						case "&":
							stack.push(left & right);
							break;
						case "|":
							stack.push(left | right);
							break;
						case "^":
							stack.push(left ^ right);
							break;
						case "%":
							stack.push(left % right);
							break;
						case "<<":
							stack.push(left << right);
							break;
						case ">>":
							stack.push(left >> right);
							break;
						case "&&":
							stack.push(left !== 0 && right !== 0 ? 1 : 0);
							break;
						case "||":
							stack.push(left !== 0 || right !== 0 ? 1 : 0);
							break;
						default:
							throw new Error(`Unknown operator: ${token.value}`);
					}

					break;
				}
			}
		}

		// After the loop, if the top of the stack is a function, it means it was called with no arguments.
		// const lastOp = operatorStack[operatorStack.length - 1];
		// if (lastOp?.type === "FUNCTION") {
		// 	outputQueue.push(operatorStack.pop() as Token);
		// }

		if (stack.length !== 1) {
			// This can happen with expressions like "5 5" which is not a valid single expression.
			// It might also indicate an issue with string literals not being part of a valid expression.
			if (rpnTokens.length === 1 && (rpnTokens[0].type === "STRING" || rpnTokens[0].type === "IDENTIFIER")) {
				return stack[0];
			}
			throw new Error("Invalid expression format.");
		}

		return stack[0];
	}

	private resolveValue(token: Token, context: Omit<EvaluationContext, "symbolTable">): SymbolValue {
		switch (token.type) {
			case "NUMBER":
				return this.parseNumericArg(token);

			case "STRING":
				return token.value;

			case "IDENTIFIER":
			case "LABEL": {
				if (token.value === "*") return context.pc;

				// First, check for macro arguments, as they have the highest precedence.
				const argTokens = context.macroArgs?.get(token.value.toUpperCase());
				if (argTokens) {
					return this.evaluate(argTokens, context);
				}

				// If not a macro argument, look it up in the symbol table.
				const value = this.symbolTable.lookupSymbol(token.value);
				if (value !== undefined) {
					return value;
				}

				if (context.allowForwardRef) return 0; // Pass 1: Assume 0 for forward references.

				// If we are here, the symbol is not defined. Let's find suggestions.
				const suggestions = this.findSimilarSymbols(token.value);
				let errorMessage = `Undefined symbol '${token.value}' on line ${token.line}.`;
				if (suggestions.length > 0) {
					errorMessage += ` Did you mean '${suggestions[0]}'?`;
				}
				throw new Error(errorMessage);
			}

			case "LOCAL_LABEL": {
				if (!context.currentGlobalLabel) {
					throw new Error(
						`Local label reference ':${token.value}' used without a preceding global label on line ${token.line}.`,
					);
				}
				const qualifiedName = `${context.currentGlobalLabel}.${token.value}`;
				const value = this.symbolTable.lookupSymbol(qualifiedName);
				if (value !== undefined) {
					return value;
				}

				if (context.allowForwardRef) return 0; // Pass 1: Assume 0 for forward references.

				throw new Error(
					`Undefined local label ':${token.value}' in scope '${context.currentGlobalLabel}' on line ${token.line}.`,
				);
			}

			case "ANONYMOUS_LABEL_REF": {
				if (!context.assembler) {
					throw new Error("Internal error: Assembler context not provided for anonymous label resolution.");
				}
				const labels = context.assembler.anonymousLabels;
				const direction = token.value.startsWith("-") ? -1 : 1;
				const count = Number.parseInt(token.value.substring(1), 10);

				if (direction === -1) {
					// Backward reference: Find the last label defined *before* the current PC.
					const relevantLabels = labels.filter((pc) => pc <= context.pc);
					if (relevantLabels.length < count) {
						throw new Error(`Not enough preceding anonymous labels to satisfy '${token.value}' on line ${token.line}.`);
					}
					return relevantLabels[relevantLabels.length - count];
				}
				// Forward reference: Find the first label defined *at or after* the current PC.
				const relevantLabels = labels.filter((pc) => pc >= context.pc);
				if (relevantLabels.length < count) {
					// During pass 2, this is a fatal error.
					throw new Error(`Not enough succeeding anonymous labels to satisfy '${token.value}' on line ${token.line}.`);
				}
				return relevantLabels[count - 1];
			}

			default:
				return 0;
		}
	}

	/** Finds symbols with a small Levenshtein distance to the given name. */
	private findSimilarSymbols(name: string, maxDistance = 2): string[] {
		const allSymbols = this.symbolTable.getAllSymbolNames();
		const suggestions: { name: string; distance: number }[] = [];

		for (const symbolName of allSymbols) {
			const distance = levenshteinDistance(name, symbolName);
			if (distance <= maxDistance) {
				suggestions.push({ name: symbolName, distance });
			}
		}

		// Sort by distance to show the closest match first
		suggestions.sort((a, b) => a.distance - b.distance);

		return suggestions.map((s) => s.name);
	}

	private parseNumericArg(token: Token): number {
		return Number.parseInt(token.value, 10);
	}
}

/** Calculates the Levenshtein distance between two strings (optimized). */
function levenshteinDistance(name: string, symbolName: string): number {
	// Early exits for common cases
	if (name === symbolName) return 0;
	if (name.length === 0) return symbolName.length;
	if (symbolName.length === 0) return name.length;

	let a: string;
	let b: string;

	// Ensure 'name' is the shorter string (optimize space)
	if (name.length > symbolName.length) {
		[a, b] = [symbolName, name];
	} else {
		[a, b] = [name, symbolName];
	}

	const aLen = a.length;
	const bLen = b.length;

	// Use two rows instead of full matrix
	let prevRow = new Array(aLen + 1);
	let currRow = new Array(aLen + 1);

	// Initialize first row
	for (let i = 0; i <= aLen; i++) {
		prevRow[i] = i;
	}

	// Calculate distances
	for (let j = 1; j <= bLen; j++) {
		currRow[0] = j;

		for (let i = 1; i <= aLen; i++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			currRow[i] = Math.min(
				currRow[i - 1] + 1, // deletion
				prevRow[i] + 1, // insertion
				prevRow[i - 1] + cost, // substitution
			);
		}

		// Swap rows (reuse arrays)
		[prevRow, currRow] = [currRow, prevRow];
	}

	return prevRow[aLen];
}
