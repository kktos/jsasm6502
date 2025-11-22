import type { Context } from "../context.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

export function fnJson(_ctx: Context, parms: (TExprStackItem | undefined)[]) {
	const parm = parms[0];
	let json: string;
	try {
		json = JSON.stringify(parm, null, 4);
	} catch (_e) {
		json = "";
	}
	return TExprStackItem.newString(json);
}
