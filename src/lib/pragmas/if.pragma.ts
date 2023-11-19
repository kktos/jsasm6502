import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TReadBlockOptions, readBlock } from "../parsers/block.parser";
import { parseExpression } from "../parsers/expression/expression.parser";

const log = console.log;

export function processIf(ctx: Context) {
	// log("if", ctx.lexer.line());

	const res = parseExpression(ctx);

	// log("if res", res);

	if (ctx.pass > 1 && (!res || res.type !== TOKEN_TYPES.NUMBER)) throw new VAParseError("Need a number");

	// log("if", ctx.lexer.token());

	const opts: TReadBlockOptions = { splitToken: "ELSE" };

	if (ctx.lexer.isToken(TOKEN_TYPES.LEFT_CURLY_BRACE)) {
		opts.isClikeBlock = true;
		ctx.lexer.next();
		if (!ctx.lexer.eol()) throw new VAParseError("BLOCK: Start block { should be the last on the line");
	}
	// const line = ctx.lexer.line();

	// log("if", ctx.lexer.line());

	const [blockTrue, blockFalse] = readBlock(ctx, opts);

	// console.log({line, willdo: !!res.value, blockTrue, blockFalse});

	const block = res?.value ? blockTrue : blockFalse;
	if (block) ctx.lexer.pushSource(block);

	return true;
}
