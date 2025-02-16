import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";

export function processSegment(ctx: Context) {
	const tok = ctx.lexer.token();
	if (!tok || tok.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError("Need a segment name");

	ctx.lexer.next();
	ctx.code.select(tok.asString);
	return true;
}
