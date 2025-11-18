import type { FunctionHandler, EvaluationStack } from "./types";
import type { Token } from "../lexer/lexer.class";

export const type: FunctionHandler = (stack: EvaluationStack, token: Token): void => {
	const arg = stack.pop();

	if (arg === undefined) {
		// This should not happen with the centralized argument validation
		throw new Error(`Internal error: stack underflow for .TYPE() on line ${token.line}.`);
	}

	let typeString: string;

	if (typeof arg === "string") {
		typeString = "string";
	} else if (typeof arg === "number") {
		typeString = "number";
	} else if (Array.isArray(arg)) {
		typeString = "array";
	} else {
		typeString = "unknown";
	}

	stack.push(typeString);
};
