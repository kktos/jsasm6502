import { Context } from "../context.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TExprStackItemNumber, parseExpression } from "../parsers/expression/expression.parser";

export function processAlign(ctx: Context) {
	const res = parseExpression(ctx, undefined, TOKEN_TYPES.NUMBER) as TExprStackItemNumber;

	const alignTo = res.value & 0xffff;
	const alignedPC = ctx.code.pc % alignTo;
	let fillByte = 0x00;

	if (ctx.lexer.isToken(TOKEN_TYPES.COMMA)) {
		ctx.lexer.next();
		const res = parseExpression(ctx, undefined, TOKEN_TYPES.NUMBER) as TExprStackItemNumber;
		fillByte = res.value;
	}

	const filled = Array.from({ length: alignTo - alignedPC }, () => fillByte);
	ctx.code.emits(ctx.pass, filled);

	return true;
}
