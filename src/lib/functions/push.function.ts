import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

const log = console.log;

export function fnPush(ctx: Context, parms: (TExprStackItem | undefined)[]) {
	const parm = parms.shift();
	if (!parm || parm.type !== TOKEN_TYPES.ARRAY)
		throw new VAParseError(`PUSH: First Parameter should be an array  - "${parm}"`);

	(parm.value as TExprStackItem[]).push(...(parms as TExprStackItem[]));

	return parm;
}
