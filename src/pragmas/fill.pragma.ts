import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { parseExpression } from "../parsers/expression.parser";

// FILL <byteCount:number> [, <fillValue:number>]
export function processFill(ctx: Context) {
	const res = parseExpression(ctx);
	if (!res || res.type !== TOKEN_TYPES.NUMBER) throw new VAParseError("Need a number");

	const byteCount = (res.value as number) & 0xffff;
	let fillByte = 0x00;

	if (ctx.lexer.isToken(TOKEN_TYPES.COMMA)) {
		ctx.lexer.next();
		const res = parseExpression(ctx);
		if (!res || res.type !== TOKEN_TYPES.NUMBER) throw new VAParseError("Need a number");
		fillByte = res.value as number;
	}

	const filled = Array.from({ length: byteCount }, () => fillByte);
	ctx.code.emits(ctx.pass, filled);

	return true;
}
