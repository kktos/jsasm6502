import type { Token } from "../lexer/lexer.class";
import type { PASymbolTable } from "../symbol.class";
import type { EvaluationStack, FunctionHandler } from "./types";

export const def: FunctionHandler = (stack: EvaluationStack, _token: Token, symbolTable: PASymbolTable): void => {
	stack.push(checkIfDefined(stack, symbolTable) ? 1 : 0);
};

export const undef: FunctionHandler = (stack: EvaluationStack, _token: Token, symbolTable: PASymbolTable): void => {
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
