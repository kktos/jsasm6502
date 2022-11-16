import { VAParseError } from "../helpers/errors.class.js";
import tokens from "../parsers/pragma.tokens.js";

export function processEnd(ctx) {

	if(ctx.lexer.token()) {
		if(!ctx.lexer.isIdentifier(tokens.NAMESPACE))
			throw new VAParseError("END: Syntax error");
		ctx.symbols.nsPop();
		ctx.lexer.next();
		return true;
	}

	ctx.lexer.stopSource();
	return true;
}
