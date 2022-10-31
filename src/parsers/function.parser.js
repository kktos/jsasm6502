import { fnDef, fnUndef } from "../functions/def.function.js";
import { fnHex } from "../functions/hex.function.js";
import { fnLen } from "../functions/len.function.js";

const ALLOW_UNDEF= { allowUndef: true};

function addFunctionDef(handlerFn, parmCount, flags, functionNames) {
	functionNames.forEach(fn => {
		functionDefs[fn]= { handlerFn, parmCount, flags };
	});
}

const functionDefs= {};
addFunctionDef(fnDef			, 1, ALLOW_UNDEF,	["DEF"]);
addFunctionDef(fnUndef			, 1, ALLOW_UNDEF,	["UNDEF"]);
addFunctionDef(fnHex			, 1, {},			["HEX"]);
addFunctionDef(fnLen			, 1, {},			["LEN"]);

export function isFunctionExists(name) {
	return functionDefs[name] != undefined;
}

export function fnParmCount(name) {
	return functionDefs[name]?.parmCount;
}

export function fnFlags(name) {
	return functionDefs[name]?.flags;
}

export function execFunction(ctx, name, parms) {
	return functionDefs[name].handlerFn(ctx, parms);
}
