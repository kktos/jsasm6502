import { VAParseError } from "../helpers/errors.class.js";
import { getHexByte, getHexWord } from "../helpers/utils.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";

export function fnHex(ctx, parms) {
	const parm= parms[0];
	if(typeof parm != "number")
		throw new VAParseError("HEX: Invalid Type");

	const value= "$" + (parm > 0xFF ? getHexWord(parm) : getHexByte(parm));
	return { value, type: TOKEN_TYPES.STRING };
}
