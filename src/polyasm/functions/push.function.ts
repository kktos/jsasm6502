import type { Token } from "../lexer/lexer.class";
import type { SymbolValue } from "../symbol.class";
import type { EvaluationStack, FunctionHandler } from "./types";

export const push: FunctionHandler = (stack: EvaluationStack, token: Token, _symbolTable, argCount): void => {
	const itemsToAdd: SymbolValue[] = [];
	for (let i = 0; i < (argCount ?? 0) - 1; i++) {
		itemsToAdd.unshift(stack.pop() as SymbolValue); // Pop items and reverse order
	}

	const arrayArg = stack.pop();

	if (!Array.isArray(arrayArg)) {
		throw new Error(`First argument to .PUSH() must be an array on line ${token.line}.`);
	}

	// Return a new array, do not mutate the original
	const newArray = [...arrayArg, ...itemsToAdd];
	stack.push(newArray);
};
