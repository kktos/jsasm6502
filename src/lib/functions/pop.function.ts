import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

const _log = console.log;

export function fnPop(_ctx: Context, parms: (TExprStackItem | undefined)[]) {
	const parm = parms.shift();
	if (!parm || parm.type !== TOKEN_TYPES.ARRAY) throw new VAParseError(`POP: First Parameter should be an array  - "${parm}"`);

	const value = (parm.value as TExprStackItem[]).pop();

	if (!value) throw new VAParseError("POP: no value to pop");

	return TExprStackItem.duplicate(value);
}
