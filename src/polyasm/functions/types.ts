import type { Token } from "../lexer/lexer.class";
import type { PASymbolTable, SymbolValue } from "../symbol.class";

export type EvaluationStack = SymbolValue[];

export type IFunction = (stack: EvaluationStack, token: Token, symbolTable: PASymbolTable, argCount: number) => void;
