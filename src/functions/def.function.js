import { TOKEN_TYPES } from "../lexer/lexer.class.js";

export function fnDef(ctx, parms) {
	const parm = parms[0];
	let value;

	if (typeof parm === "string") {
		let [ns, name] = parm.toUpperCase().split(".");
		if (!name) {
			name = ns;
			ns = null;
		}
		value = ctx.symbols.exists(name, ns);
	} else value = parm !== undefined;

	return { value, type: TOKEN_TYPES.NUMBER };
}

export function fnUndef(ctx, parms) {
	const res = fnDef(ctx, parms);
	res.value = !res.value;
	return res;
}
