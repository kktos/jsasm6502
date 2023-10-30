import { Context } from "../context.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TExprStackItemValueType } from "../parsers/expression/expression.parser";

export function fnDef(ctx: Context, parms: TExprStackItemValueType[]) {
	const parm = parms[0];
	let value;

	if (typeof parm === "string") {
		let ns: string | null;
		let name: string | null;
		[ns, name] = parm.toUpperCase().split(".");
		if (!name) {
			name = ns;
			ns = null;
		}
		value = ctx.symbols.exists(name, ns);
	} else value = parm !== undefined;

	return { value, type: TOKEN_TYPES.NUMBER };
}

export function fnUndef(ctx: Context, parms: TExprStackItemValueType[]) {
	const res = fnDef(ctx, parms);
	res.value = !res.value;
	return res;
}
