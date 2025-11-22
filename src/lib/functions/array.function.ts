import type { Context } from "../context.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

const _log = console.log;

export function fnArray(_ctx: Context, parms: (TExprStackItem | undefined)[]) {
	// log(".array() -> ", JSON.stringify(parms) );
	return TExprStackItem.newArray(parms);
}
