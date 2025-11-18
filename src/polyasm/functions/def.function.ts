import type { PASymbolTable } from "../symbol.class";
import type { IFunction, EvaluationStack } from "./types";
import type { Token } from "../lexer/lexer.class";

export const def: IFunction = (
	stack: EvaluationStack,
	token: Token,
	symbolTable: PASymbolTable,
	argCount: number,
): void => {
	if (argCount !== 1) {
		throw new Error(`.DEF() requires 1 argument, but got ${argCount} on line ${token.line}.`);
	}
	stack.push(checkIfDefined(stack, symbolTable) ? 1 : 0);
};

export const undef: IFunction = (
	stack: EvaluationStack,
	token: Token,
	symbolTable: PASymbolTable,
	argCount: number,
): void => {
	if (argCount !== 1) {
		throw new Error(`.UNDEF() requires 1 argument, but got ${argCount} on line ${token.line}.`);
	}
	stack.push(checkIfDefined(stack, symbolTable) ? 0 : 1);
};

function checkIfDefined(stack: EvaluationStack, symbolTable: PASymbolTable) {
	const arg = stack.pop();
	let isDefined = false;

	switch (typeof arg) {
		case "undefined":
			isDefined = false;
			break;
		case "object":
			isDefined = arg !== null;
			break;
		case "number":
			isDefined = arg !== 0;
			break;
		case "string":
			isDefined = symbolTable.lookupSymbol(arg) !== undefined;
			break;
	}

	return isDefined;
}
