/**
 * expression.ts
 * * Defines the expression evaluation engine for the assembler.
 * * Uses the Shunting-Yard algorithm for precedence and parentheses.
 */

import { functionDispatcher } from "./functions/dispatcher";
import type { FunctionToken, OperatorStackToken, OperatorToken, Token } from "./lexer/lexer.class";
import type { Logger } from "./logger";
import type { Assembler } from "./polyasm";
import type { PASymbolTable, SymbolValue } from "./symbol.class";
import { resolveSysVar } from "./sysvar";

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
	constructor(
		private assembler: Assembler,
		_logger: Logger,
	) {}

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
		if (typeof result !== "number") throw new Error("Expression did not evaluate to a number as expected.");

		return result;
	}

	/**
	 * Evaluates the contents of an array literal.
	 * e.g., [ "red", "green", 1+2 ]
	 */
	private evaluateArray(tokens: Token[], context: Omit<EvaluationContext, "symbolTable">): SymbolValue[] {
		const elements: SymbolValue[] = [];
		let currentExpression: Token[] = [];

		const evaluateAndPush = () => {
			if (currentExpression.length > 0) {
				const result = this.evaluate(currentExpression, context);
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

	/** Handles comma tokens, used as separators in function arguments. */
	private handleComma(token: Token, outputQueue: Token[], operatorStack: Token[]): void {
		// A comma separates arguments, so we evaluate the expression for the current argument.
		while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].value !== "(") {
			outputQueue.push(operatorStack.pop() as Token);
		}

		// Ensure the comma is inside a function call.
		let foundParen = false;
		for (let k = operatorStack.length - 1; k >= 0; k--) {
			if (operatorStack[k].value === "(") {
				foundParen = true;
				// Increment argument count of the function, which is right before the '('.
				if (k > 0 && operatorStack[k - 1].type === "FUNCTION") {
					const funcToken = operatorStack[k - 1];
					// Safely increment argCount
					funcToken.argCount = (funcToken.argCount ?? 0) + 1;
				}
				break;
			}
		}
		if (!foundParen) throw new Error(`Unexpected comma on line ${token.line}.`);
	}

	/** Handles all operator tokens, including parentheses and unary operators. Returns a potentially modified token. */
	private handleOperator(token: OperatorToken, outputQueue: Token[], operatorStack: OperatorStackToken[], lastToken: Token | undefined): Token {
		const op = token.value;
		const isUnary = !lastToken || lastToken.value === "(" || (lastToken.type === "OPERATOR" && lastToken.value !== ")");

		switch (op) {
			case "[": // Array access
				operatorStack.push({ ...token, value: "ARRAY_ACCESS" });
				operatorStack.push({ ...token, value: "(" }); // Virtual '(' for index expression.
				break;

			case "]": {
				// Closing bracket for array access
				let foundParen = false;
				while (operatorStack.length > 0) {
					const topOp = operatorStack.pop() as Token;
					if (topOp.value === "(") {
						foundParen = true;
						break;
					}
					outputQueue.push(topOp);
				}
				if (!foundParen) throw new Error(`Mismatched brackets: unmatched ']' on line ${token.line}.`);

				const arrayAccessOp = operatorStack.pop();
				if (arrayAccessOp?.value !== "ARRAY_ACCESS") {
					throw new Error(`Mismatched brackets: ']' without preceding array access on line ${token.line}.`);
				}
				outputQueue.push(arrayAccessOp);
				break;
			}

			case "-":
			case "+":
				if (isUnary) {
					if (op === "-") {
						const unaryToken: OperatorToken = {
							...token,
							value: "UNARY_MINUS",
						};
						this.pushOperatorWithPrecedence(unaryToken, outputQueue, operatorStack);
					}
					// Unary '+' is a no-op, so we do nothing.
				} else {
					this.pushOperatorWithPrecedence(token, outputQueue, operatorStack);
				}
				break;

			case "!":
				if (!isUnary) throw new Error(`Operator '!' must be unary on line ${token.line}.`);
				this.pushOperatorWithPrecedence(token, outputQueue, operatorStack);
				break;

			case "*":
				if (isUnary) {
					// This is the program counter symbol, not multiplication. Treat as an identifier.
					const pcToken = { ...token, type: "IDENTIFIER" as const };
					outputQueue.push(pcToken);
					return pcToken; // Return the modified token
				}
				this.pushOperatorWithPrecedence(token, outputQueue, operatorStack);
				break;

			case "(":
				operatorStack.push(token);
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
				if (!foundMatch) throw new Error(`Mismatched parenthesis: unmatched ')' on line ${token.line}.`);

				// If the token before the '(' was a function, pop it to the output.
				const topOfStack = operatorStack[operatorStack.length - 1];
				if (topOfStack?.type === "FUNCTION") {
					const funcToken = operatorStack.pop() as Token;
					// If there's only one argument and it's empty (e.g., .FOO()), arg count is 0.
					if (funcToken.argCount === 1 && lastToken?.value === "(") {
						funcToken.argCount = 0;
					}
					outputQueue.push(funcToken);
				}
				break;
			}

			default: // Default case for all other binary operators
				this.pushOperatorWithPrecedence(token, outputQueue, operatorStack);
				break;
		}
		return token;
	}

	/** Helper function to handle operator precedence during Shunting-Yard. */
	private pushOperatorWithPrecedence(token: OperatorStackToken, outputQueue: Token[], operatorStack: OperatorStackToken[]): void {
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

	/** Converts an infix token stream to Reverse Polish Notation (RPN). */
	private infixToRPN(tokens: Token[], context: Omit<EvaluationContext, "symbolTable">) {
		const outputQueue: Token[] = [];
		const operatorStack: (OperatorToken | FunctionToken)[] = [];
		let lastToken: Token | undefined;

		for (let index = 0; index < tokens.length; index++) {
			let processedToken = tokens[index]; // Use a mutable token for processing

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
				let j = index + 1;
				for (; j < tokens.length; j++) {
					if (tokens[j].value === "[") balance++;
					if (tokens[j].value === "]") balance--;
					if (balance === 0) break;
				}

				if (balance !== 0) throw new Error(`Mismatched brackets in array literal on line ${processedToken.line}.`);

				const arrayContentTokens = tokens.slice(index + 1, j);
				const arrayValue = this.evaluateArray(arrayContentTokens, context);
				const arrayToken: Token = {
					type: "ARRAY",
					line: processedToken.line,
					column: processedToken.column,
					value: arrayValue, // Assign the evaluated array directly to the 'value' field
				};
				outputQueue.push(arrayToken);
				index = j; // Move index past the array
				lastToken = arrayToken;
				continue;
			}

			switch (processedToken.type) {
				case "IDENTIFIER": {
					if (lastToken?.type === "DOT") {
						// Check for function call, e.g., IDENTIFIER followed by '('.
						if (tokens[index + 1]?.value === "(") {
							const funcToken: FunctionToken = {
								...processedToken,
								type: "FUNCTION",
								argCount: 1, // Default to 1 for the first argument.
							};
							operatorStack.push(funcToken);
							lastToken = funcToken;
							continue;
						}

						const funcToken: Token = {
							...processedToken,
							type: "SYSVAR",
						};
						outputQueue.push(funcToken);
						break;
					}

					// An operand should not follow another operand without an operator in between.
					if (lastToken && lastToken.type !== "OPERATOR" && lastToken.type !== "COMMA" && lastToken.value !== "(")
						throw new Error(`Invalid expression format: Unexpected token '${processedToken.value}' on line ${processedToken.line}.`);

					outputQueue.push(processedToken);
					break;
				}
				case "NUMBER":
				case "STRING":
				case "LABEL":
				case "LOCAL_LABEL":
				case "ANONYMOUS_LABEL_REF":
				case "ARRAY":
					// An operand should not follow another operand without an operator in between.
					if (lastToken && lastToken.type !== "OPERATOR" && lastToken.type !== "COMMA" && lastToken.value !== "(")
						throw new Error(`Invalid expression format: Unexpected token '${processedToken.value}' on line ${processedToken.line}.`);

					outputQueue.push(processedToken);
					break;

				case "COMMA":
					this.handleComma(processedToken, outputQueue, operatorStack);
					break;
				case "OPERATOR":
					processedToken = this.handleOperator(processedToken as OperatorToken, outputQueue, operatorStack, lastToken);
					break;
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

	/** Evaluates a Reverse Polish Notation (RPN) token stream. */
	private evaluateRPN(rpnTokens: Token[], context: Omit<EvaluationContext, "symbolTable">): SymbolValue {
		const stack: SymbolValue[] = [];

		for (const token of rpnTokens) {
			switch (token.type) {
				case "NUMBER":
					stack.push(Number.parseInt(token.value, 10));
					break;

				case "STRING":
					stack.push(token.value);
					break;

				case "ARRAY":
					stack.push(token.value);
					break;

				case "IDENTIFIER":
				case "LABEL":
				case "LOCAL_LABEL":
				case "ANONYMOUS_LABEL_REF": {
					// resolveValue handles all symbol, macro arg, and special value lookups.
					const value = this.resolveValue(token, context);
					stack.push(value);
					break;
				}

				case "SYSVAR": {
					// Resolve system variables like .NAMESPACE / .NS and .PC
					const val = resolveSysVar(token, {
						pc: context.pc,
						symbolTable: this.assembler.symbolTable,
						pass: this.assembler.pass,
					});
					stack.push(val);
					break;
				}

				case "FUNCTION": {
					const argCount = token.argCount ?? 0;
					functionDispatcher(token.value.toUpperCase(), stack, token, this.assembler.symbolTable, argCount);
					break;
				}

				case "OPERATOR": {
					const right = stack.pop();
					if (this.handleUnaryOperator(token as OperatorToken, right, stack)) break;
					if (this.handleArrayAccessOperator(token as OperatorToken, right, stack)) break;
					this.handleBinaryOperator(token as OperatorToken, right, stack);
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

	private handleUnaryOperator(token: OperatorToken, right: SymbolValue | undefined, stack: SymbolValue[]): boolean {
		if (token.value === "UNARY_MINUS") {
			if (typeof right !== "number") throw new Error("Unary operator requires a numeric operand.");
			stack.push(-right);
			return true;
		}
		if (token.value === "!") {
			if (typeof right !== "number") throw new Error("Unary operator '!' requires a numeric operand.");
			stack.push(right === 0 ? 1 : 0);
			return true;
		}
		return false;
	}

	private handleArrayAccessOperator(token: OperatorToken, right: SymbolValue | undefined, stack: SymbolValue[]): boolean {
		if (token.value === "ARRAY_ACCESS") {
			if (typeof right !== "number") throw new Error(`Array index must be a number on line ${token.line}.`);

			const array = stack.pop() as SymbolValue[];
			if (!Array.isArray(array)) throw new Error(`Attempted to index a non-array value on line ${token.line}.`);

			if (right < 0 || right >= array.length) throw new Error(`Array index ${right} out of bounds for array of length ${array.length} on line ${token.line}.`);

			stack.push(array[right]);
			return true;
		}
		return false;
	}

	private handleBinaryOperator(token: OperatorToken, right: SymbolValue | undefined, stack: SymbolValue[]): void {
		const left = stack.pop();
		if (left === undefined || right === undefined) throw new Error(`Binary operator '${token.value}' requires two operands.`);

		// Handle string operations first
		if (typeof left === "string" || typeof right === "string") {
			const leftStr = String(left);
			const rightStr = String(right);
			switch (token.value) {
				case "+":
					stack.push(leftStr + rightStr);
					return;
				case "=":
				case "==":
					stack.push(leftStr === rightStr ? 1 : 0);
					return;
				case "!=":
					stack.push(leftStr !== rightStr ? 1 : 0);
					return;
				default:
					throw new Error(`Operator '${token.value}' cannot be applied to strings.`);
			}
		}

		if (typeof left !== "number" || typeof right !== "number") throw new Error(`Binary operator '${token.value}' requires two numbers.`);

		// Numeric operations
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
	}

	private resolveValue(token: Token, context: Omit<EvaluationContext, "symbolTable">): SymbolValue {
		switch (token.type) {
			case "NUMBER":
				return Number.parseInt(token.value, 10);

			case "STRING":
				return token.value;

			case "IDENTIFIER":
			case "LABEL": {
				if (token.value === "*") return context.pc;

				// PRIORITY 1: Check if it's a macro argument from the current stream context.
				const macroArgTokens = context.macroArgs?.get(token.value);
				if (macroArgTokens)
					// Recursively evaluate the tokens passed as the argument.
					return this.evaluate(macroArgTokens, context);

				// Look up the symbol in the current scope stack.
				const value = this.assembler.symbolTable.lookupSymbol(token.value);

				// If the symbol's value is an array of tokens, it's a macro parameter.
				// We need to evaluate it recursively. This handles .EQU with token arrays.
				if (Array.isArray(value) && value[0]?.type) return this.evaluate(value as Token[], context);

				if (value !== undefined) return value;

				if (context.allowForwardRef) return 0; // Pass 1: Assume 0 for forward references.

				// If we are here, the symbol is not defined. Let's find suggestions.
				const suggestions = this.assembler.symbolTable.findSimilarSymbols(token.value);
				let errorMessage = `Undefined symbol '${token.value}' on line ${token.line}.`;
				if (suggestions.length > 0) errorMessage += ` Did you mean '${suggestions[0]}'?`;

				throw new Error(errorMessage);
			}

			case "LOCAL_LABEL": {
				if (!context.currentGlobalLabel) {
					throw new Error(`Local label reference ':${token.value}' used without a preceding global label on line ${token.line}.`);
				}
				const qualifiedName = `${context.currentGlobalLabel}.${token.value}`;
				const value = this.assembler.symbolTable.lookupSymbol(qualifiedName);
				if (value !== undefined) return value;

				if (context.allowForwardRef) return 0; // Pass 1: Assume 0 for forward references.

				throw new Error(`Undefined local label ':${token.value}' in scope '${context.currentGlobalLabel}' on line ${token.line}.`);
			}

			case "ANONYMOUS_LABEL_REF": {
				const labels = this.assembler.anonymousLabels;
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
				if (relevantLabels.length < count)
					// During pass 2, this is a fatal error.
					throw new Error(`Not enough succeeding anonymous labels to satisfy '${token.value}' on line ${token.line}.`);

				return relevantLabels[count - 1];
			}

			default:
				return 0;
		}
	}
}
