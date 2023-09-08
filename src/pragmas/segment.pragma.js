import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";

export function processSegment(ctx) {
	const tok = ctx.lexer.token();
	if (tok.type !== TOKEN_TYPES.IDENTIFIER)
		throw new VAParseError("Need a segment name");

	ctx.lexer.next();
	ctx.code.select(tok.value);
	return true;
}
