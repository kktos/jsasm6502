import type { Token } from "../lexer/lexer.class";
import type { IFunction, EvaluationStack } from "./types";

export const len: IFunction = (stack: EvaluationStack, token: Token, _symbolTable, argCount: number): void => {
	if (argCount !== 1) {
		throw new Error(`.LEN() requires 1 argument, but got ${argCount} on line ${token.line}.`);
	}

	const arg = stack.pop();

	if (typeof arg !== "string" && !Array.isArray(arg))
		throw new Error(`.LEN() requires a string or array argument on line ${token.line}.`);

	stack.push(arg.length);
};
