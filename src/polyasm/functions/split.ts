import type { IFunction, EvaluationStack } from "./types";
import type { Token } from "../lexer/lexer.class";

export const split: IFunction = (stack: EvaluationStack, token: Token, _symbolTable, argCount: number): void => {
	if (argCount < 1 || argCount > 2) {
		throw new Error(`.SPLIT() requires 1 or 2 arguments, but got ${argCount} on line ${token.line}.`);
	}

	const delimiterArg = argCount === 2 ? stack.pop() : " ";
	const stringArg = stack.pop();

	if (typeof stringArg !== "string") {
		throw new Error(`First argument to .SPLIT() must be a string on line ${token.line}.`);
	}
	if (typeof delimiterArg !== "string") {
		throw new Error(`Second argument to .SPLIT() (delimiter) must be a string on line ${token.line}.`);
	}

	stack.push(stringArg.split(delimiterArg));
};
