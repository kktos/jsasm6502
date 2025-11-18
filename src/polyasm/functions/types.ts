import type { Token } from "../lexer/lexer.class";
import type { SymbolValue } from "../symbol.class";

export type EvaluationStack = SymbolValue[];

export type IFunction = (stack: EvaluationStack, token: Token) => void;
