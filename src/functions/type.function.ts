import { Context } from "../context.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TExprStackItemValueType } from "../parsers/expression/expression.parser";

export function fnType(ctx: Context, parms: TExprStackItemValueType[]) {
	const parm = parms[0];
	let type: string = typeof parm;
	if (Array.isArray(parm)) type = "array";
	return { value: type, type: TOKEN_TYPES.STRING };
}
