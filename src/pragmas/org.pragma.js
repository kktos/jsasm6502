import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { parseExpression } from "../parsers/expression.parser.js";

export function processOrg(ctx) {
	const res= parseExpression(ctx);
	if(res.type != TOKEN_TYPES.NUMBER)
		throw new VAParseError("ORG: Need an address");

	ctx.code.setPC(res.value);
}
