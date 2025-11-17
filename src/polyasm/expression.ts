/**
 * expression.ts
 * * Defines the expression evaluation engine for the assembler.
 * * Uses the Shunting-Yard algorithm for precedence and parentheses.
 */

import type { Token } from "./lexer/lexer.class";
import type { PASymbolTable, SymbolValue } from "./symbol.class";

/**
 * Provides the context needed for the expression evaluator to resolve symbols
 * and the current program counter.
 */
export interface EvaluationContext {
	symbolTable: PASymbolTable;
	pc: number;
	macroArgs?: Map<string, Token[]>;
	allowForwardRef?: boolean;
}

export class ExpressionEvaluator {
	private symbolTable: PASymbolTable;

	constructor(symbolTable: PASymbolTable) {
		this.symbolTable = symbolTable;
	}

	/**
	 * Resolves an array of tokens into a single numeric value using the
	 * Shunting-Yard algorithm for precedence and RPN evaluation.
	 */
	public evaluate(tokens: Token[], context: Omit<EvaluationContext, "symbolTable">): SymbolValue {
		if (tokens.length === 0) return 0;

		// Handle array literal parsing
		if (tokens[0]?.value === "[" && tokens[tokens.length - 1]?.value === "]") {
			return this.evaluateArray(tokens.slice(1, -1), context);
		}

		const rpnTokens = this.infixToRPN(tokens);
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

	private getPrecedence(op: string): number {
		if (op === "UNARY_MINUS") return 8; // Highest precedence (e.g., -5)
		if (op === "*" || op === "/" || op === "%") return 7; // Multiplication, Division, Modulo
		if (op === "+" || op === "-") return 6; // Addition, Subtraction
		if (op === "<<" || op === ">>") return 5; // Bitwise shifts
		if (op === "<" || op === ">" || op === "<=" || op === ">=") return 4; // Relational
		if (op === "=" || op === "==" || op === "!=") return 3; // Equality
		if (op === "&") return 2; // Bitwise AND
		if (op === "^") return 1; // Bitwise XOR
		if (op === "|") return 0; // Bitwise OR
		return 0;
	}

	/** Converts an infix token stream to Reverse Polish Notation (RPN). */

	private infixToRPN(tokens: Token[]) {
		const outputQueue: Token[] = [];
		const operatorStack: Token[] = [];
		let lastToken: Token | null = null;

		for (const currentToken of tokens) {
			let processedToken = currentToken; // Use a mutable token for processing

			switch (processedToken.type) {
				case "NUMBER":
				case "STRING":
				case "IDENTIFIER":
				case "LABEL":
					// An operand should not follow another operand without an operator in between.
					if (
						lastToken &&
						(lastToken.type === "NUMBER" ||
							lastToken.type === "IDENTIFIER" ||
							lastToken.type === "LABEL" ||
							lastToken.type === "STRING")
					) {
						throw new Error(
							`Invalid expression format: Unexpected token '${processedToken.value}' on line ${processedToken.line}.`,
						);
					}
					outputQueue.push(processedToken);
					break;

				case "OPERATOR": {
					const op = processedToken.value;
					const isUnary =
						!lastToken || lastToken.value === "(" || (lastToken.type === "OPERATOR" && lastToken.value !== ")");

					switch (
						op // Use op from the original token
					) {
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
								const topOp = operatorStack.pop()!;
								if (topOp.value === "(") {
									foundMatch = true;
									break;
								}
								outputQueue.push(topOp);
							}
							if (!foundMatch) {
								throw new Error(`Mismatched parenthesis: unmatched ')' on line ${processedToken.line}.`);
							}
							break;
						}
					}
				}
			}
			lastToken = processedToken;
		}

		while (operatorStack.length > 0) {
			const op = operatorStack.pop()!;
			if (op.value === "(" || op.value === ")") {
				throw new Error(`Mismatched parenthesis: unmatched '(' left in stack.`);
			}
			outputQueue.push(op);
		}

		return outputQueue;
	}

	/** Helper function to handle operator precedence during Shunting-Yard. */
	private pushOperatorWithPrecedence(token: Token, outputQueue: Token[], operatorStack: Token[]): void {
		const currentPrecedence = this.getPrecedence(token.value);

		while (operatorStack.length > 0) {
			const topOp = operatorStack[operatorStack.length - 1];
			if (topOp.value === "(") break;

			const topPrecedence = this.getPrecedence(topOp.value);

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
		const stack: (number | string)[] = [];

		for (const token of rpnTokens) {
			switch (token.type) {
				case "NUMBER":
					stack.push(this.parseNumericArg(token));
					break;

				case "STRING":
					stack.push(token.value);
					break;

				case "IDENTIFIER":
				case "LABEL": {
					const value = this.resolveValue(token, context);
					if (typeof value === "number" || typeof value === "string") {
						stack.push(value);
						break;
					}

					// This part handles macro argument substitution where the argument itself is an expression
					const argTokens = context.macroArgs?.get(token.value.toUpperCase());
					if (argTokens) {
						const result = this.evaluate(argTokens, context);
						if (typeof result === "number" || typeof result === "string") {
							stack.push(result);
						} else {
							// This case would be for array arguments, which can't be pushed onto the numeric stack.
							// The logic should handle this based on where the macro is used.
						}
					}

					break;
				}

				case "OPERATOR": {
					if (token.value === "UNARY_MINUS") {
						const value = stack.pop();
						if (typeof value !== "number") throw new Error("Unary operator requires a numeric operand.");
						stack.push(-value);
						break;
					}

					const right = stack.pop();
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
						default:
							throw new Error(`Unknown operator: ${token.value}`);
					}

					break;
				}
			}
		}

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
		if (token.type === "NUMBER") {
			return this.parseNumericArg(token);
		}
		if (token.type === "STRING") {
			return token.value;
		}
		if (token.type === "IDENTIFIER" || token.type === "LABEL") {
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

			throw new Error(`Undefined symbol '${token.value}' on line ${token.line}.`);
		}
		return 0;
	}

	private parseNumericArg(token: Token): number {
		return Number.parseInt(token.value, 10);
	}
}
