import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { getHexByte, getHexWord } from "../helpers/utils";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
import { TValueType } from "../types/Value.type";

export function fnHex(ctx: Context, parms: TValueType[]) {
	const parm = parms[0];
	if (typeof parm !== "number") throw new VAParseError(`HEX: Invalid Type ${typeof parm}`);

	const value = `$${parm > 0xff ? getHexWord(parm) : getHexByte(parm)}`;
	return TExprStackItem.newString(value); // { value, type: TOKEN_TYPES.STRING };
}
