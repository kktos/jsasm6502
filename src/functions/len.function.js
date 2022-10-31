import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";

export function fnLen(ctx, parms) {
	const parm= parms[0];

	console.log("fnLen", parm);

	if(!Array.isArray(parm) && typeof parm != "string")
		throw new VAParseError("LEN: Invalid Type");

	const value= parm.length;
	return { value, type: TOKEN_TYPES.NUMBER };
}
