import type { Context } from "../context.class";
import { getTypeName } from "../lexer/token.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

const log = console.log;

export function fnType(ctx: Context, parms: (TExprStackItem | undefined)[]) {
	const parm = parms[0];

	// log("type", typeof parm, JSON.stringify(parm));
	const type = getTypeName(parm?.type ?? 0).toLowerCase();

	return TExprStackItem.newString(type);
}
