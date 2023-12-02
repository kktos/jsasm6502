import { Context } from "../context.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

const log = console.log;

export function fnArray(ctx: Context, parms: (TExprStackItem | undefined)[]) {
	// log(".array() -> ", JSON.stringify(parms) );
	return TExprStackItem.newArray(parms);
}
