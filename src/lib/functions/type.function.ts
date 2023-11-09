import { Context } from "../context.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
import { TValueType } from "../types/Value.type";

export function fnType(ctx: Context, parms: TValueType[]) {
	const parm = parms[0];
	let type: string = typeof parm;
	if (Array.isArray(parm)) type = "array";
	return TExprStackItem.newString(type); //{ value: type, type: TOKEN_TYPES.STRING };
}
