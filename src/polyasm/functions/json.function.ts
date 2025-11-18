import type { FunctionHandler, EvaluationStack } from "./types";
import type { Token } from "../lexer/lexer.class";

export const json: FunctionHandler = (stack: EvaluationStack, token: Token): void => {
	const arg = stack.pop();

	if (arg === undefined) {
		// This should not happen with the centralized argument validation
		throw new Error(`Internal error: stack underflow for .JSON() on line ${token.line}.`);
	}

	const jsonString = JSON.stringify(arg);
	stack.push(jsonString);
};
