import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { parseExpression } from "../parsers/expression.parser.js";

export function parseOrg(ctx) {
	ctx.lexer.next();
	
	if(!ctx.lexer.isToken(TOKEN_TYPES.EQUAL))
		throw new VAParseError("Syntax Error");
	
	ctx.lexer.next();
	
	const res= parseExpression(ctx);
	if(res.type != TOKEN_TYPES.NUMBER)
		throw new VAParseError("Need an address");
	
	ctx.code.setPC(res.value);	
}