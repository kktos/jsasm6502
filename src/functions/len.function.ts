import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TExprStackItemValueType } from "../parsers/expression/expression.parser";

export function fnLen(ctx: Context, parms: TExprStackItemValueType[]) {
	const parm = parms[0];

	// console.log("fnLen", parm);

	if (!Array.isArray(parm) && typeof parm !== "string") throw new VAParseError(`LEN: Invalid Type "${typeof parm}"`);

	const value = parm.length;
	return { value, type: TOKEN_TYPES.NUMBER };
}
