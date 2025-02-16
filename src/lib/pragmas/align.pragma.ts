import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { parseExpression } from "../parsers/expression/expression.parser";

export function processAlign(ctx: Context) {
	const res = parseExpression(ctx, undefined, TOKEN_TYPES.NUMBER);
	if (!res) throw new VAParseError("ALIGN: need a value");

	const alignTo = res.number & 0xffff;
	const alignedPC = ctx.code.pc % alignTo;
	let fillByte = 0x00;

	if (ctx.lexer.isToken(TOKEN_TYPES.COMMA)) {
		ctx.lexer.next();
		const res = parseExpression(ctx, undefined, TOKEN_TYPES.NUMBER);
		if (!res) throw new VAParseError("ALIGN: need a value for padding");
		fillByte = res.number;
	}

	const filled = Array.from({ length: alignTo - alignedPC }, () => fillByte);
	ctx.code.emits(ctx.pass, filled);

	return true;
}
