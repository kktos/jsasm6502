import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import type { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

const _log = console.log;

export function fnIif(_ctx: Context, parms: (TExprStackItem | undefined)[]) {
	const parm = parms[0];
	if (parm?.type !== TOKEN_TYPES.NUMBER) throw new VAParseError(`IIF: Parameter should be a number =0 or !=0  - "${parm}"`);

	if (!parms[1]) throw new VAParseError("IIF: True value is undefined");
	if (!parms[2]) throw new VAParseError("IIF: False value is undefined");

	return parm.number !== 0 ? parms[1] : parms[2];
}
