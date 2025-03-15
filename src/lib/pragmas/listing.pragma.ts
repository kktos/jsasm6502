import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { parseExpression } from "../parsers/expression/expression.parser";

export function processListing(ctx: Context) {
	const token = ctx.lexer.token();

	// const res= parseExpression(ctx);
	if (!token || token.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError("Needed a ON or OFF here");

	switch (token.value) {
		case "ON":
			ctx.wantListing = true;
			break;
		case "OFF":
			ctx.wantListing = false;
			break;
		case "FILE": {
			ctx.lexer.next();
			const res = parseExpression(ctx);
			if (!res || res.type !== TOKEN_TYPES.STRING) throw new VAParseError("FILE: Need a filename");
			ctx.listingFile = res.value as string;
			break;
		}
		default:
			throw new VAParseError("Needed a ON or OFF here. Or FILE");
	}
	ctx.lexer.next();

	return true;
}
