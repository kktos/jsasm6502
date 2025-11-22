import type { Token } from "../lexer/lexer.class";
import type { EvaluationStack, FunctionHandler } from "./types";

export const split: FunctionHandler = (stack: EvaluationStack, token: Token, _symbolTable, argCount): void => {
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
