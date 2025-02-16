import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { parseExpression } from "../parsers/expression/expression.parser";

export function processInclude(ctx: Context) {
	const res = parseExpression(ctx);
	if (!res || res.type !== TOKEN_TYPES.STRING) throw new VAParseError("Need a filename");

	const asBin = ctx.lexer.isIdentifier("ASBIN");

	if (asBin) {
		const { content } = ctx._readFile(res.value as string, ctx.filename ?? undefined, true);
		ctx.code.emits(ctx.pass, content as Buffer);
		ctx.lexer.next();
	} else {
		ctx.pushFile(res.value as string, ctx.filename ?? undefined);
	}

	return true;
}
