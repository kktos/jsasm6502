import { Context } from "../context.class";
import { fnDef, fnUndef } from "../functions/def.function";
import { fnHex } from "../functions/hex.function";
import { fnLen } from "../functions/len.function";
import { fnType } from "../functions/type.function";
import { fnEval } from "../functions/eval.function";
import { TExprStackItem } from "./expression/TExprStackItem.class";
import { fnSplit } from "../functions/split.function";
import { fnJson } from "../functions/json.function";
import { fnArray } from "../functions/array.function";
import { fnPush } from "../functions/push.function";
import { fnPop } from "../functions/pop.function";

export type TFunctionFlags = {
	allowUndef?: boolean;
	minParmCount?: number;
	maxParmCount?: number;
};
type THandlerFn = (ctx: Context, parms: (TExprStackItem | undefined)[]) => TExprStackItem;
type TFunctionDef = {
	handlerFn: THandlerFn;
	flags: TFunctionFlags;
};
type TFunctionDefs = Record<string, TFunctionDef>;

function addFunctionDef(handlerFn: THandlerFn, functionNames: string[], flags: TFunctionFlags) {
	for (const fn of functionNames) {
		functionDefs[fn] = { handlerFn, flags };
	}
}

const functionDefs: TFunctionDefs = {};

addFunctionDef(fnDef, ["DEF"], { maxParmCount: 1, allowUndef: true });
addFunctionDef(fnUndef, ["UNDEF"], { maxParmCount: 1, allowUndef: true });
addFunctionDef(fnHex, ["HEX"], { maxParmCount: 2, minParmCount: 1 });
addFunctionDef(fnLen, ["LEN"], { maxParmCount: 1 });
addFunctionDef(fnType, ["TYPE"], { maxParmCount: 1 });
addFunctionDef(fnEval, ["EVAL"], { maxParmCount: 1 });
addFunctionDef(fnSplit, ["SPLIT"], { maxParmCount: 2, minParmCount: 1 });
addFunctionDef(fnJson, ["JSON"], { maxParmCount: 1 });
addFunctionDef(fnArray, ["ARRAY"], { minParmCount: 0 });
addFunctionDef(fnPush, ["PUSH"], { minParmCount: 2 });
addFunctionDef(fnPop, ["POP"], { maxParmCount: 0 });

export function isFunctionExists(name: string) {
	return functionDefs[name] !== undefined;
}

export function fnParmCount(name: string) {
	const fn = functionDefs[name];
	return { minParmCount: fn.flags.minParmCount, maxParmCount: fn.flags.maxParmCount };
}

export function fnFlags(name: string) {
	return functionDefs[name]?.flags;
}

export function execFunction(ctx: Context, name: string, parms: (TExprStackItem | undefined)[]) {
	return functionDefs[name].handlerFn(ctx, parms);
}
