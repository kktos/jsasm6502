import type { Token } from "../lexer/lexer.class";
import type { SymbolValue } from "../symbol.class";
import type { EvaluationStack, FunctionHandler } from "./types";

export const array: FunctionHandler = (stack: EvaluationStack, token: Token, _symbolTable, argCount): void => {
	const newArray: SymbolValue[] = [];

	for (let i = 0; i < (argCount ?? 0); i++) {
		const arg = stack.pop();
		if (arg === undefined) {
			// This should not happen if argCount is correct
			throw new Error(`Internal error: stack underflow for .ARRAY() on line ${token.line}.`);
		}
		newArray.unshift(arg); // unshift to maintain original argument order
	}

	stack.push(newArray);
};
