import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { parseExpression } from "../parsers/expression.parser.js";

export function processFill(ctx) {
	const res= parseExpression(ctx);
	if(res.type != TOKEN_TYPES.NUMBER)
		throw new VAParseError("Need a number");
	
	const byteCount= res.value & 0xFFFF;
	let fillByte= 0x00;

	if(ctx.lexer.isToken(TOKEN_TYPES.COMMA)) {
		ctx.lexer.next();
		const res= parseExpression(ctx);
		if(res.type != TOKEN_TYPES.NUMBER)
			throw new VAParseError("Need a number");
		fillByte= res.value;
	}

	const filled= Array.from({length: byteCount}, () => fillByte);
	ctx.code.emits(ctx.pass, ...filled);

}
