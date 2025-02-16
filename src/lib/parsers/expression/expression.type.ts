import type { Context } from "../../context.class";
import type { TFunctionFlags } from "../function.parser";
import type { TExprStackItem } from "./TExprStackItem.class";

type TOperationCmp = "<" | "<=" | "=" | ">" | ">=" | "!=";
type TOperationLogical = "AND" | "OR" | "!";
type TOperationArithm = "+" | "-" | "*" | "/" | "NEG";
type TOperationBool = "BXOR" | "BAND" | "BOR";
type TOperationAddr = "MSB" | "LSB";
type TOperationFn = "FN";
export type TExprStackOperation =
	| TOperationCmp
	| TOperationLogical
	| TOperationArithm
	| TOperationBool
	| TOperationAddr
	| TOperationFn;

export type TExprStack = Array<TExprStackItem | Array<TExprStackItem>>;

export type TExprCtx = {
	ctx: Context;
	stack: TExprStack;
	endSet?: Set<number>;
	flags?: TFunctionFlags;
};
