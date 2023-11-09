import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";

export function processNamespace(ctx: Context) {
	let ns = undefined;

	const token = ctx.lexer.token();
	if (token) {
		if (token.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError("Need a namespace name");
		ns = token.asString;
	}

	// console.log("NAMESPACE", ns);

	ctx.symbols.ns.select(ns);

	ctx.lexer.next();

	return true;
}
