import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";

export function processListing(ctx: Context) {
	const token = ctx.lexer.token();

	// const res= parseExpression(ctx);
	if (!token || token.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError("Needed a ON or OFF here");

	switch (token.value) {
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

	return true;
}
