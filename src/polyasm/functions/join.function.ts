import type { Token } from "../lexer/lexer.class";
import type { EvaluationStack, FunctionHandler } from "./types";

export const join: FunctionHandler = (stack: EvaluationStack, token: Token): void => {
	const separator = stack.pop();
	const arrayArg = stack.pop();

	if (!Array.isArray(arrayArg)) {
		throw new Error(`First argument to .JOIN() must be an array on line ${token.line}.`);
	}

	if (typeof separator !== "string") {
		throw new Error(`Second argument to .JOIN() must be a string on line ${token.line}.`);
	}

	// The native join method handles converting number elements to strings automatically.
	stack.push(arrayArg.join(separator));
};
