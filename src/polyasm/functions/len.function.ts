import type { Token } from "../lexer/lexer.class";
import type { FunctionHandler, EvaluationStack } from "./types";

export const len: FunctionHandler = (stack: EvaluationStack, token: Token): void => {
	const arg = stack.pop();

	if (typeof arg !== "string" && !Array.isArray(arg))
		throw new Error(`.LEN() requires a string or array argument on line ${token.line}.`);

	stack.push(arg.length);
};
