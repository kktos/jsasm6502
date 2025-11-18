import type { FunctionHandler, EvaluationStack } from "./types";
import type { Token } from "../lexer/lexer.class";

export const iif: FunctionHandler = (stack: EvaluationStack, token: Token): void => {
	const falseValue = stack.pop();
	const trueValue = stack.pop();
	const condition = stack.pop();

	if (typeof condition !== "number") {
		throw new Error(`First argument to .IIF() must be a number on line ${token.line}.`);
	}

	const result = condition !== 0 ? trueValue : falseValue;

	stack.push(result);
};
