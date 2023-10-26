import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { addLabel } from "../parsers/label.parser";

const log = console.log;

export function processFunction(ctx: Context) {
	const token = ctx.lexer.token();
	if (token?.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError("Need a function name");

	if (ctx.pass === 1) ctx.symbols.fnDeclare(token.asString);

	addLabel(ctx, token.asString, { type: TOKEN_TYPES.NUMBER, value: ctx.code.pc });
	ctx.symbols.fnEnter(token.asString);

	// log("processFunction", token.asString, ctx.symbols.dump());
	ctx.lexer.next();

	return true;
}
