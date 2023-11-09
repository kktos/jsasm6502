import { Context } from "../context.class.js";
import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/token.class.js";

export function processOption(ctx: Context) {
	let token = ctx.lexer.token();
	if (!token || token.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError("OPTION: need an option name");

	const option = token.asString;
	ctx.lexer.next();
	switch (option) {
		case "CHARMAP": {
			token = ctx.lexer.token();

			if (!token || token.type !== TOKEN_TYPES.IDENTIFIER)
				throw new VAParseError("OPTION: need a defined charmap name");

			const parm = token.asString;
			ctx.lexer.next();

			ctx.charMapManager.map(parm !== "NONE" ? parm : null);

			break;
		}

		default:
			throw new VAParseError(`OPTION: unknown option ${option}`);
	}

	return true;
}
