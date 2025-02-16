import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { parseExpression } from "../parsers/expression/expression.parser";
import { addLabel } from "../parsers/label.parser";

const log = console.log;

// .let <string expression use for name> = < expression >
export function processLet(ctx: Context) {
	let res = parseExpression(ctx, new Set([TOKEN_TYPES.EQUAL]), TOKEN_TYPES.STRING);
	if (!res) throw new VAParseError("LET: need a variable name");

	const name = res.string.toUpperCase();

	if (!ctx.lexer.isToken(TOKEN_TYPES.EQUAL)) throw new VAParseError("LET: Missing '=' for identifier = value");

	ctx.lexer.next();

	res = parseExpression(ctx);
	if (!res) throw new VAParseError("LET: need a variable value");

	// log("let", name, res);

	addLabel(ctx, name, res);

	// log("LET GET", ctx.pass, ctx.symbols.get(name));
	// log(ctx.pass, ctx.symbols.dump());

	return true;
}
