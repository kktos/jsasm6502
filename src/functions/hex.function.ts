import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { getHexByte, getHexWord } from "../helpers/utils";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TExprStackItemValueType } from "../parsers/expression.parser";

export function fnHex(ctx: Context, parms: TExprStackItemValueType[]) {
	const parm = parms[0];
	if (typeof parm !== "number") throw new VAParseError(`HEX: Invalid Type ${typeof parm}`);

	const value = `$${parm > 0xff ? getHexWord(parm) : getHexByte(parm)}`;
	return { value, type: TOKEN_TYPES.STRING };
}
