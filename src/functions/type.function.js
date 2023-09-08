import { TOKEN_TYPES } from "../lexer/lexer.class.js";

export function fnType(ctx, parms) {
	const parm = parms[0];
	let type = typeof parm;
	if (Array.isArray(parm)) type = "array";
	return { value: type, type: TOKEN_TYPES.STRING };
}
