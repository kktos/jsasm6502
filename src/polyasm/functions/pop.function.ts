import type { FunctionHandler, EvaluationStack } from "./types";
import type { Token } from "../lexer/lexer.class";

export const pop: FunctionHandler = (stack: EvaluationStack, token: Token): void => {
	const arrayArg = stack.pop();

	if (!Array.isArray(arrayArg) || arrayArg.length === 0) {
		throw new Error(`Argument to .POP() must be a non-empty array on line ${token.line}.`);
	}

	stack.push(arrayArg[arrayArg.length - 1]);
};
