import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";

export function processListing(ctx) {
	// const res= parseExpression(ctx);
	if (!ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
		throw new VAParseError("Needed a ON or OFF here");

	switch (ctx.lexer.token().value) {
		case "ON":
			ctx.wannaListing = true;
			break;
		case "OFF":
			ctx.wannaListing = false;
			break;
		default:
			throw new VAParseError("Needed a ON or OFF here");
	}
	ctx.lexer.next();
}
