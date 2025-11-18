import type { IFunction, EvaluationStack } from "./types";
import type { Token } from "../lexer/lexer.class";
import type { SymbolValue } from "../symbol.class";

export const push: IFunction = (stack: EvaluationStack, token: Token, _symbolTable, argCount: number): void => {
	if (argCount < 2) {
		throw new Error(`.PUSH() requires at least 2 arguments (an array and an item to add) on line ${token.line}.`);
	}

	const itemsToAdd: SymbolValue[] = [];
	for (let i = 0; i < argCount - 1; i++) {
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
