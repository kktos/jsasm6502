import type { Token } from "../lexer/lexer.class";
import type { PASymbolTable, SymbolValue } from "../symbol.class";

export type EvaluationStack = SymbolValue[];

export type FunctionHandler = (stack: EvaluationStack, token: Token, symbolTable: PASymbolTable, argCount?: number) => void;

export interface IFunctionDef {
	handler: FunctionHandler;
	minArgs: number;
	maxArgs: number;
}
