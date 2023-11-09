import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
import { TValueType } from "../types/Value.type";

export function fnLen(ctx: Context, parms: TValueType[]) {
	const parm = parms[0];

	// console.log("fnLen", parm);

	if (!Array.isArray(parm) && typeof parm !== "string") throw new VAParseError(`LEN: Invalid Type "${typeof parm}"`);

	const value = parm.length;
	return TExprStackItem.newNumber(value); // { value, type: TOKEN_TYPES.NUMBER };
}
