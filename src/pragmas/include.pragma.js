import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { parseExpression } from "../parsers/expression.parser.js";

export function processInclude(ctx) {
	const res= parseExpression(ctx);
	if(res.type != TOKEN_TYPES.STRING)
		throw new VAParseError("Need a filename");
		
	ctx.pushFile(res.value, ctx.filename);
}
