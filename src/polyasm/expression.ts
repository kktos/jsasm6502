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

		// New: Handle array literal parsing
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
		if (op === "UNARY_MINUS") return 4; // Highest precedence
		if (op === "*" || op === "/") return 3;
		if (op === "+" || op === "-") return 2;
		return 0;
	}

	/** Converts an infix token stream to Reverse Polish Notation (RPN). */
	private infixToRPN(tokens: Token[]): Token[] {
		const outputQueue: Token[] = [];
		const operatorStack: Token[] = [];
		let lastToken: Token | null = null;

		for (const token of tokens) {
			if (token.type === "NUMBER" || token.type === "IDENTIFIER" || token.type === "LABEL") {
				outputQueue.push(token);
			} else if (token.type === "OPERATOR") {
				const op = token.value;
				const isUnary =
					!lastToken || lastToken.value === "(" || (lastToken.type === "OPERATOR" && lastToken.value !== ")");

				if (op === "+" || op === "-") {
					if (isUnary) {
						const unaryToken: Token = {
							type: "OPERATOR",
							value: "UNARY_MINUS",
							line: token.line,
							column: token.column,
						};
						if (op === "-") {
							this.pushOperatorWithPrecedence(unaryToken, outputQueue, operatorStack);
						}
					} else {
						this.pushOperatorWithPrecedence(token, outputQueue, operatorStack);
					}
				} else if (op === "*" || op === "/") {
					this.pushOperatorWithPrecedence(token, outputQueue, operatorStack);
				} else if (op === "(") {
					operatorStack.push(token);
				} else if (op === ")") {
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
						throw new Error(`Mismatched parenthesis: unmatched ')' on line ${token.line}.`);
					}
				}
			}
			lastToken = token;
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
		const stack: number[] = [];

		for (const token of rpnTokens) {
			switch (token.type) {
				case "NUMBER":
					stack.push(this.parseNumericArg(token));
					break;

				case "IDENTIFIER":
				case "LABEL": {
					const value = this.resolveValue(token, context);
					if (typeof value === "number") {
						stack.push(value);
						break;
					}

					const argTokens = context.macroArgs?.get(token.value.toUpperCase());
					if (argTokens) {
						const result = this.evaluate(argTokens, context);
						if (typeof result === "number") stack.push(result);
					}

					break;
				}

				case "OPERATOR":
					if (token.value === "UNARY_MINUS") {
						const value = stack.pop();
						if (value === undefined) throw new Error("Unary operator requires one operand.");
						stack.push(-value);
					} else {
						const right = stack.pop();
						const left = stack.pop();
						if (left === undefined || right === undefined)
							throw new Error(`Binary operator '${token.value}' requires two operands.`);

						switch (token.value) {
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
							default:
								throw new Error(`Unknown operator: ${token.value}`);
						}
					}
					break;
			}
		}

		if (stack.length !== 1) {
			throw new Error("Invalid expression format.");
		}

		return stack[0];
	}

	private resolveValue(token: Token, context: Omit<EvaluationContext, "symbolTable">): SymbolValue {
		if (token.type === "NUMBER") {
			return this.parseNumericArg(token);
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
		const value = token.value.replace(/\s/g, "");
		if (value.startsWith("$")) return Number.parseInt(value.substring(1), 16);
		if (value.startsWith("%")) return Number.parseInt(value.substring(1), 2);
		return Number.parseInt(value, 10);
	}
}
