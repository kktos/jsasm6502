import type { PASymbolTable } from "../symbol.class";
import type { IFunction, EvaluationStack } from "./types";
import type { Token } from "../lexer/lexer.class";

export const undef: IFunction = (
	stack: EvaluationStack,
	token: Token,
	symbolTable: PASymbolTable,
	argCount: number,
): void => {
	if (argCount !== 1) {
		throw new Error(`.UNDEF() requires 1 argument, but got ${argCount} on line ${token.line}.`);
	}
	const arg = stack.pop();

	if (typeof arg !== "string") {
		throw new Error(`.UNDEF() requires a string or identifier argument on line ${token.line}.`);
	}

	const isDefined = symbolTable.lookupSymbol(arg) !== undefined;
	stack.push(isDefined ? 0 : 1);
};
