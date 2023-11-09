import { Context } from "../context.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
import { TValueType } from "../types/Value.type";

export function fnDef(ctx: Context, parms: TValueType[]) {
	const parm = parms[0];
	let value;

	if (typeof parm === "string") {
		let ns: string | undefined;
		let name: string | null;
		[ns, name] = parm.toUpperCase().split(".");
		if (!name) {
			name = ns;
			ns = undefined;
		}
		value = ctx.symbols.exists(name, ns);
	} else value = parm !== undefined;

	return TExprStackItem.newNumber(Number(value)); // { value, type: TOKEN_TYPES.NUMBER };
}

export function fnUndef(ctx: Context, parms: TValueType[]) {
	const res = fnDef(ctx, parms);
	res.number = res.number ? 0 : 1;
	return res;
}
