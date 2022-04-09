import { fnDef, fnUndef } from "./functions/def.function.js";
import { fnLen } from "./functions/len.function.js";

function addFunctionDef(handlerFn, functionNames) {
	functionNames.forEach(fn => {
		functionDefs[fn]= {handlerFn};
	});
}

const functionDefs= {};
addFunctionDef(fnDef			, ["DEF"]);
addFunctionDef(fnUndef			, ["UNDEF"]);
addFunctionDef(fnLen			, ["LEN"]);

export function isFunction(name) {
	return functionDefs[name] != undefined;
}

export function execFunction(ctx, name, parms) {
	return functionDefs[name].handlerFn(ctx, parms);
}
