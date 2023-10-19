import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";

export function processExport(ctx: Context) {
	const tok = ctx.lexer.token();
	ctx.lexer.next();
	if (ctx.symbols.isGlobal) {
		return true;
	}

	switch (tok?.type) {
		case TOKEN_TYPES.IDENTIFIER: {
			if (ctx.pass === 2 && !ctx.symbols.exists(tok.asString)) throw new VAParseError("EXPORT: Unknown symbol");
			ctx.symbols.export(tok.asString);
			break;
		}

		case TOKEN_TYPES.STRING: {
			const count = ctx.symbols.exportMany(tok.asString);
			if (!count) throw new VAParseError("EXPORT: No match so nothing to export");
			break;
		}

		default:
			throw new VAParseError("EXPORT: Need a symbol name or regex");
	}

	return true;
}
