import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";

export function processNamespace(ctx) {
	let ns = null;

	if (ctx.lexer.token()) {
		if (!ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
			throw new VAParseError("Need a namespace name");
		ns = ctx.lexer.token().value;
	}

	ctx.symbols.select(ns);

	ctx.lexer.next();
}
