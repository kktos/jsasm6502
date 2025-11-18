import type { IFunction, EvaluationStack } from "./types";
import type { Token } from "../lexer/lexer.class";

export const hex: IFunction = (stack: EvaluationStack, token: Token, _symbolTable, argCount: number): void => {
	if (argCount < 1 || argCount > 2) {
		throw new Error(`.HEX() requires 1 or 2 arguments, but got ${argCount} on line ${token.line}.`);
	}

	const minDigitsArg = argCount === 2 ? stack.pop() : undefined;
	const valueArg = stack.pop();

	if (typeof valueArg !== "number") {
		throw new Error(`First argument to .HEX() must be a number on line ${token.line}.`);
	}
	if (minDigitsArg !== undefined && typeof minDigitsArg !== "number") {
		throw new Error(`Second argument to .HEX() (minDigits) must be a number on line ${token.line}.`);
	}

	let hexString = valueArg.toString(16).toUpperCase();
	if (minDigitsArg !== undefined) {
		hexString = hexString.padStart(minDigitsArg, "0");
	}

	stack.push(`$${hexString}`);
};
