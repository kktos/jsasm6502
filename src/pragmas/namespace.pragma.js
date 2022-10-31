import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";

export function processNamespace(ctx) {
	if(!ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
		throw new VAParseError("Need a namespace name");

	ctx.symbols.select( ctx.lexer.token().value );
	
	// console.log("processNamespace", ctx.lexer.token().value, ctx.symbols.ns);

	ctx.lexer.next();
}
