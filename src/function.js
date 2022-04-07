import { isNSentryDefined } from "./namespace.js";

const functions= {
	DEF: isDefined,
	UNDEF: isUndefined
};

export function isFunction(name) {
	return functions[name] != undefined;
}

export function execFunction(ctx, name, parms) {
	return functions[name](ctx, parms);
}

function isDefined(ctx, parms) {
	return typeof parms == "string" ? isNSentryDefined(ctx, parms.toUpperCase()) : parms != undefined;
}

function isUndefined(ctx, parms) {
	const  isUndef= !isDefined(ctx, parms);
	return isUndef;
}
