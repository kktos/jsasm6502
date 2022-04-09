import { isNSentryDefined } from "../namespace.js";

export function fnDef(ctx, parms) {
	return typeof parms == "string" ? isNSentryDefined(ctx, parms.toUpperCase()) : parms != undefined;
}

export function fnUndef(ctx, parms) {
	return !fnDef(ctx, parms);
}