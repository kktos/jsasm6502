import { Context } from "../context.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

export function fnArray(ctx: Context, parms: (TExprStackItem | undefined)[]) {
	return TExprStackItem.newArray(parms);
}
