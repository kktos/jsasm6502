import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { parseExpression } from "../parsers/expression.parser.js";

const log= console.log;

export function processASMOuput(ctx, pragma) {
	let msg = "";

	do {
		const res = parseExpression(ctx);
		msg += (typeof res.value === "object" ? JSON.stringify(res.value) : res.value);
		if (ctx.lexer.isToken(TOKEN_TYPES.COMMA)) {
			ctx.lexer.next();
			if (!ctx.lexer.token()) throw new VAParseError("OUT: Missing value here");
		}
	} while (ctx.lexer.token() !== false);

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
}
