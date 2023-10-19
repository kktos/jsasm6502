import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { tokens } from "../parsers/pragma.tokens";

export function processEnd(ctx: Context) {
	if (ctx.lexer.token()) {
		if (!ctx.lexer.isIdentifier(tokens.NAMESPACE)) throw new VAParseError("END: Syntax error");
		ctx.symbols.nsPop();
		ctx.lexer.next();
		return true;
	}

	ctx.lexer.stopSource();
	return true;
}
