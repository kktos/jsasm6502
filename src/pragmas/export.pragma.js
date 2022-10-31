import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";

export function processExport(ctx) {
	const tok= ctx.lexer.token();

	if(ctx.pass>1 && !ctx.symbols.isGlobal) {
		switch(tok.type) {
			
			case TOKEN_TYPES.IDENTIFIER: {
				if(!ctx.symbols.exists(tok.value))
					throw new VAParseError("Unknown symbol");
				ctx.symbols.export(tok.value);
				break;
			}
	
			case TOKEN_TYPES.STRING:
				const count= ctx.symbols.exportMany(tok.value);
				if(!count)
					throw new VAParseError("No match so nothing to export");
				break;
	
			default:
				throw new VAParseError("Need a symbol name or regex");
		}
	}

	ctx.lexer.next();
}
