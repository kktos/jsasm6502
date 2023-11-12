import { Context } from "../context.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

export function fnJson(ctx: Context, parms: (TExprStackItem | undefined)[]) {
	const parm = parms[0];
	let json: string;
	try {
		json= JSON.stringify(parm);
	}
	catch(e) {
		json= "";
	}
	return TExprStackItem.newString(json);
}
