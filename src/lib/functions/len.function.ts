import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

const log = console.log;

export function fnLen(ctx: Context, parms: (TExprStackItem | undefined)[]) {
	const parm = parms[0];
	if (!parm || (parm?.type !== TOKEN_TYPES.STRING && parm?.type !== TOKEN_TYPES.ARRAY))
		throw new VAParseError(`LEN: Parameter should be a string or an array  - "${parm}"`);

	// log("fnLen", JSON.stringify(parm));

	const value = parm.array.length;
	return TExprStackItem.newNumber(value);
}
