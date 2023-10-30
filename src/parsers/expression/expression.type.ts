import { Context } from "../../context.class";
import { TFunctionFlags } from "../function.parser";

export type TExprStackItemValueType = number | string | Record<string, unknown> | boolean | Array<unknown>;
export type TExprStackItem = {
	type: number;
	value: TExprStackItemValueType;
	op?: string;
	fn?: string;
	parmCount?: number;
	extra?: Record<string, unknown>;
};
export type TExprStackItemNumber = { value: number } & Omit<TExprStackItem, "value">;

export type TExprStack = Array<TExprStackItem | Array<TExprStackItem>>;

export type TExprCtx = {
	ctx: Context;
	stack: TExprStack;
	endSet?: Set<number>;
	flags?: TFunctionFlags;
};
