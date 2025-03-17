import type { Context } from "../context.class";
import { fnDef, fnUndef } from "../functions/def.function";
import { fnHex } from "../functions/hex.function";
import { fnLen } from "../functions/len.function";
import { fnType } from "../functions/type.function";
import { fnEval } from "../functions/eval.function";
import type { TExprStackItem } from "./expression/TExprStackItem.class";
import { fnSplit } from "../functions/split.function";
import { fnJson } from "../functions/json.function";
import { fnArray } from "../functions/array.function";
import { fnPush } from "../functions/push.function";
import { fnPop } from "../functions/pop.function";
import { fnIif } from "../functions/iif.function";

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

const NO_PARM = { minParmCount: 0, maxParmCount: 0 };
const NONE_TO_MANY = { minParmCount: 0 };
const ONE_PARM = { maxParmCount: 1 };

function addFunctionDef(handlerFn: THandlerFn, functionNames: string[], flags: TFunctionFlags) {
	for (const fn of functionNames) {
		functionDefs[fn] = { handlerFn, flags };
	}
}

const functionDefs: TFunctionDefs = {};

addFunctionDef(fnDef, ["DEF"], { maxParmCount: 1, allowUndef: true });
addFunctionDef(fnUndef, ["UNDEF"], { maxParmCount: 1, allowUndef: true });
addFunctionDef(fnHex, ["HEX"], { maxParmCount: 2, minParmCount: 1 });
addFunctionDef(fnLen, ["LEN"], ONE_PARM);
addFunctionDef(fnType, ["TYPE"], ONE_PARM);
addFunctionDef(fnEval, ["EVAL"], ONE_PARM);
addFunctionDef(fnSplit, ["SPLIT"], { maxParmCount: 2, minParmCount: 1 });
addFunctionDef(fnJson, ["JSON"], ONE_PARM);
addFunctionDef(fnArray, ["ARRAY"], NONE_TO_MANY);
addFunctionDef(fnPush, ["PUSH"], { minParmCount: 2 });
addFunctionDef(fnPop, ["POP"], ONE_PARM);
addFunctionDef(fnIif, ["IIF"], { minParmCount: 3, maxParmCount: 3 });

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
