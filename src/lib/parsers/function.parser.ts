import { Context } from "../context.class";
import { fnDef, fnUndef } from "../functions/def.function";
import { fnHex } from "../functions/hex.function";
import { fnLen } from "../functions/len.function";
import { fnType } from "../functions/type.function";
import { fnEval } from "../functions/eval.function";
import { TValueType } from "../types/Value.type";
import { TExprStackItem } from "./expression/TExprStackItem.class";
import { fnSplit } from "../functions/split.function";
import { fnJson } from "../functions/json.function";
import { fnArray } from "../functions/array.function";

export type TFunctionFlags = {
	allowUndef?: boolean;
};
type THandlerFn = (ctx: Context, parms: (TExprStackItem | undefined)[]) => TExprStackItem;
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
addFunctionDef(fnHex, -1, {}, ["HEX"]);
addFunctionDef(fnLen, 1, {}, ["LEN"]);
addFunctionDef(fnType, 1, {}, ["TYPE"]);
addFunctionDef(fnEval, 1, {}, ["EVAL"]);
addFunctionDef(fnSplit, -1, {}, ["SPLIT"]);
addFunctionDef(fnJson, 1, {}, ["JSON"]);
addFunctionDef(fnArray, -1, {}, ["ARRAY"]);

export function isFunctionExists(name: string) {
	return functionDefs[name] !== undefined;
}

export function fnParmCount(name: string) {
	return functionDefs[name]?.parmCount;
}

export function fnFlags(name: string) {
	return functionDefs[name]?.flags;
}

export function execFunction(ctx: Context, name: string, parms: (TExprStackItem | undefined)[]) {
	return functionDefs[name].handlerFn(ctx, parms);
}
