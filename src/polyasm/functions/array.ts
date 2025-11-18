import type { IFunction, EvaluationStack } from "./types";
import type { Token } from "../lexer/lexer.class";
import type { SymbolValue } from "../symbol.class";

export const array: IFunction = (stack: EvaluationStack, token: Token, _symbolTable, argCount: number): void => {
	const newArray: SymbolValue[] = [];

	for (let i = 0; i < argCount; i++) {
		const arg = stack.pop();
		if (arg === undefined) {
			// This should not happen if argCount is correct
			throw new Error(`Internal error: stack underflow for .ARRAY() on line ${token.line}.`);
		}
		newArray.unshift(arg); // unshift to maintain original argument order
	}

	stack.push(newArray);
};
