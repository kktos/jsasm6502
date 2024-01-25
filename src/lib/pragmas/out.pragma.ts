import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
import { parseExpression } from "../parsers/expression/expression.parser";

const log = console.log;

export function processASMOuput(ctx: Context, pragma: string) {
	let msg = "";

	do {
		const res = parseExpression(ctx);
		if (!res) throw new VAParseError("OUT: Missing value here");

		// log("OUT parm", JSON.stringify(res));

		switch (res.type) {
			case TOKEN_TYPES.OBJECT:
				msg += JSON.stringify(res.value);
				break;
			case TOKEN_TYPES.ARRAY: {
				const items = (res.value as unknown[]).map((item) => {
					if (item instanceof TExprStackItem) return TExprStackItem.asString(item, { withType: false });
					return JSON.stringify(item);
				});
				msg += `[${items}]`;
				break;
			}
			default:
				msg += res.value;
		}

		if (ctx.lexer.isToken(TOKEN_TYPES.COMMA)) {
			ctx.lexer.next();
			if (!ctx.lexer.token()) throw new VAParseError("OUT: Missing value here");
		}
	} while (ctx.lexer.token() !== null);

	switch (pragma) {
		case "OUT":
		case "ECHO":
		case "LOG":
			// log("ECHO", ctx.pass, msg);
			ctx.print(msg, false);
			break;

		case "WARNING":
			ctx.warn(msg);
			break;

		case "ERROR":
			throw new VAParseError(msg);
	}

	return true;
}
