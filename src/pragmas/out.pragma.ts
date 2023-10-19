import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { parseExpression } from "../parsers/expression.parser";

export function processASMOuput(ctx: Context, pragma: string) {
	let msg = "";

	do {
		const res = parseExpression(ctx);
		if (!res) throw new VAParseError("OUT: Missing value here");

		msg += typeof res.value === "object" ? JSON.stringify(res.value) : res.value;
		if (ctx.lexer.isToken(TOKEN_TYPES.COMMA)) {
			ctx.lexer.next();
			if (!ctx.lexer.token()) throw new VAParseError("OUT: Missing value here");
		}
	} while (ctx.lexer.token() !== null);

	switch (pragma) {
		case "OUT":
		case "ECHO":
		case "LOG":
			ctx.print(msg, true);
			break;

		case "WARNING":
			ctx.warn(msg);
			break;

		case "ERROR":
			throw new VAParseError(msg);
	}

	return true;
}
