import type { PASymbolTable } from "../symbol.class";
import type { IFunction, EvaluationStack } from "./types";
import type { Token } from "../lexer/lexer.class";

export const def: IFunction = (stack: EvaluationStack, token: Token, symbolTable: PASymbolTable): void => {
	const arg = stack.pop();

	if (typeof arg !== "string") {
		throw new Error(`.DEF() requires a string or identifier argument on line ${token.line}.`);
	}

	const isDefined = symbolTable.lookupSymbol(arg) !== undefined;
	stack.push(isDefined ? 1 : 0);
};
