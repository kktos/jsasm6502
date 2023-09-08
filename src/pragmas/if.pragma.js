import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { readBlock } from "../parsers/block.parser.js";
import { parseExpression } from "../parsers/expression.parser.js";

export function processIf(ctx, pragma) {
	const res = parseExpression(ctx);

	if (res.type !== TOKEN_TYPES.NUMBER) throw new VAParseError("Need a number");

	const line = ctx.lexer.line();

	const [blockTrue, blockFalse] = readBlock(ctx, "ELSE");

	// console.log({line, willdo: !!res.value, blockTrue, blockFalse});

	const block = res.value ? blockTrue : blockFalse;
	if (block) ctx.lexer.pushSource(block);

	return true;
}
