import { Context } from "../context.class";
import { fnDef, fnUndef } from "../functions/def.function";
import { fnHex } from "../functions/hex.function";
import { fnLen } from "../functions/len.function";
import { fnType } from "../functions/type.function";
import { TExprStackItem, TExprStackItemValueType } from "./expression.parser";

export type TFunctionFlags = {
	allowUndef?: boolean;
};
type THandlerFn = (ctx: Context, parms: TExprStackItemValueType[]) => TExprStackItem;
type TFunctionDef = {
	handlerFn: THandlerFn;
	parmCount: number;
	flags: TFunctionFlags;
};
type TFunctionDefs = Record<string, TFunctionDef>;

const ALLOW_UNDEF = { allowUndef: true };

function addFunctionDef(handlerFn: THandlerFn, parmCount: number, flags: TFunctionFlags, functionNames: string[]) {
	for (const fn of functionNames) {
		functionDefs[fn] = { handlerFn, parmCount, flags };
	}
}

const functionDefs: TFunctionDefs = {};

addFunctionDef(fnDef, 1, ALLOW_UNDEF, ["DEF"]);
addFunctionDef(fnUndef, 1, ALLOW_UNDEF, ["UNDEF"]);
addFunctionDef(fnHex, 1, {}, ["HEX"]);
addFunctionDef(fnLen, 1, {}, ["LEN"]);
addFunctionDef(fnType, 1, {}, ["TYPE"]);

export function isFunctionExists(name: string) {
	return functionDefs[name] !== undefined;
}

export function fnParmCount(name: string) {
	return functionDefs[name]?.parmCount;
}

export function fnFlags(name: string) {
	return functionDefs[name]?.flags;
}

export function execFunction(ctx: Context, name: string, parms: TExprStackItemValueType[]) {
	return functionDefs[name].handlerFn(ctx, parms);
}
