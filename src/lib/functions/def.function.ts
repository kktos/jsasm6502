import { Context } from "../context.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

const log= console.log;

export function fnDef(ctx: Context, parms: (TExprStackItem | undefined)[]) {
	const parm = parms[0];
	let value;

	// log("fnDef parm", parm, JSON.stringify(parm));

	if (parm?.type === TOKEN_TYPES.STRING) {
		let ns: string | undefined;
		let name: string | null;
		[ns, name] = parm.string.toUpperCase().split(".");
		if (!name) {
			name = ns;
			ns = undefined;
		}
		value = ctx.symbols.exists(name, ns);

		// log("fnDef", ns, name, value);

	} else value = (parm?.value !== undefined) && (parm?.value !== null);

	return TExprStackItem.newNumber(Number(value));
}

export function fnUndef(ctx: Context, parms: (TExprStackItem | undefined)[]) {
	const res = fnDef(ctx, parms);
	res.number = res.number ? 0 : 1;
	return res;
}
