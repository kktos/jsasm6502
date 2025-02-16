import type { Context } from "../context.class";
import { dbgStringList } from "../helpers/debug";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { type TReadBlockOptions, isPragma, readBlock } from "../parsers/block.parser";
import { parseExpression } from "../parsers/expression/expression.parser";

const log = console.log;
/*
	; ASM style
	.if <expr>
		<block>
	.else 			; optional
		<block> 	; only if else
	.end

	; C style
	.if <expr> {
		<block>
	} .else { 		; optional
		<block> 	; only if else
	}
*/
export function processIf(ctx: Context) {
	// log("if", ctx.lexer.line());

	// const IF_LINE=  ctx.lexer.line();

	const res = parseExpression(ctx);

	// log("if res", res);

	if (ctx.pass > 1 && (!res || res.type !== TOKEN_TYPES.NUMBER))
		throw new VAParseError("IF: Need a number; 0 (false) or not 0 (true)");

	// log("if", ctx.lexer.token());

	const opts: TReadBlockOptions = {};

	// if (ctx.lexer.isToken(TOKEN_TYPES.LEFT_CURLY_BRACE)) {
	// 	opts.isClikeBlock = true;
	// 	ctx.lexer.next();
	// 	if (!ctx.lexer.eol()) throw new VAParseError("BLOCK: Start block { should be the last on the line");
	// }
	// const line = ctx.lexer.line();

	// log("if", ctx.lexer.line());

	// log("IF BLOCK");

	let blockFalse = "";
	const [blockTrue] = readBlock(ctx, opts);

	// log(`IF BLOCK [${ctx.lexer.id}]`, dbgStringList(blockTrue.split("\n")));

	if (ctx.lexer.eol()) ctx.lexer.nextLine();

	// log("ELSE ?", ctx.lexer.line().trim());

	const hasElseBlock = isPragma(ctx.lexer, "ELSE");

	if (hasElseBlock) {
		// log("IF ELSE", ctx.lexer.pos().line, ctx.lexer.line().trim(), ctx.lexer.token(), ctx.lexer.eol());

		// log("else", ctx.lexer.line());

		ctx.lexer.next();
		ctx.lexer.next();

		// log("ELSE BLOCK");

		ctx.lexer.lines().push("} <-");
		[blockFalse] = readBlock(ctx, opts);
		ctx.lexer.lines().pop();

		// log(`ELSE BLOCK [${ctx.lexer.id}]`, dbgStringList(blockFalse.split("\n")));

		// log("ELSE", blockFalse);
		// log("token", ctx.lexer.token());
	}

	// console.log({line, willdo: !!res.value, blockTrue, blockFalse});

	const block = res?.value ? blockTrue : blockFalse;

	// log("FINAL", res?.value ?"IF":"ELSE", ctx.lexer.token());
	// log(block);

	if (!hasElseBlock) {
		ctx.lexer.keepOnLine();
		ctx.needNewline = false;
	}

	// log(`IF END [${ctx.lexer.id}]`, !hasElseBlock ? "STAY" : "NEXT");

	if (block) ctx.lexer.pushSource(block);

	return true;
}
