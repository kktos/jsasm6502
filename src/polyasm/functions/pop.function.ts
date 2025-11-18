import type { IFunction, EvaluationStack } from "./types";
import type { Token } from "../lexer/lexer.class";

export const pop: IFunction = (stack: EvaluationStack, token: Token, _symbolTable, argCount: number): void => {
	if (argCount !== 1) {
		throw new Error(`.POP() requires exactly 1 argument (an array) on line ${token.line}.`);
	}

	const arrayArg = stack.pop();

	if (!Array.isArray(arrayArg) || arrayArg.length === 0) {
		throw new Error(`Argument to .POP() must be a non-empty array on line ${token.line}.`);
	}

	stack.push(arrayArg[arrayArg.length - 1]);
};
