import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { readBlock } from "../parsers/block.parser";
import { parseExpression } from "../parsers/expression.parser";

export function processIf(ctx: Context) {
	const res = parseExpression(ctx);

	if (!res || res.type !== TOKEN_TYPES.NUMBER) throw new VAParseError("Need a number");

	// const line = ctx.lexer.line();

	const [blockTrue, blockFalse] = readBlock(ctx, "ELSE");

	// console.log({line, willdo: !!res.value, blockTrue, blockFalse});

	const block = res.value ? blockTrue : blockFalse;
	if (block) ctx.lexer.pushSource(block);

	return true;
}
