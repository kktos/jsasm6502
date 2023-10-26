import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { tokens } from "../parsers/pragma.tokens";

const log = console.log;

// .end
//     if in a function, ends it
//     if not, ends the assembly
// .end function
// .end namespace
export function processEnd(ctx: Context) {
	if (ctx.lexer.token()) {
		const isNS = ctx.lexer.isIdentifier(tokens.NAMESPACE);
		const isFN = ctx.lexer.isIdentifier(tokens.FUNCTION);
		if (!isNS && !isFN) throw new VAParseError("END: Syntax error");

		if (isNS) ctx.symbols.nsUnselect();
		else ctx.symbols.fnLeave();

		ctx.lexer.next();
		return true;
	}

	if (ctx.symbols.fnIsOneActive()) {
		ctx.symbols.fnLeave();
		return true;
	}

	// log("end stopSource");
	ctx.lexer.stopSource();
	return true;
}
