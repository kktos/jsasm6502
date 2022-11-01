import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { parseExpression } from "../parsers/expression.parser.js";

export function processASMOuput(ctx, pragma) {

	// INTERNAL USE ONLY
	// if(ctx.sym[ctx.ofs] == "%DEBUG%") {
	// 	ctx.ofs++;
	// 	switch(ctx.sym[ctx.ofs++]) {
	// 		case "VAR": {
	// 			ctx.pict= "DEBUG: " + ctx.sym[ctx.ofs]+"\n";
	// 			ctx.pict+= JSON.stringify( getNSentry(ctx, ctx.sym[ctx.ofs]) );
	// 			break;
	// 		}
	// 		case "SYM": {
	// 			ctx.pict= "DEBUG: <" + ctx.sym.slice(3).join('> <')+">\n";
	// 			break;
	// 		}
	// 	}
	// 	ctx.wannaOutput ? logLine(ctx, true) : console.log(ctx.pict);
	// 	return true;
	// }

	let msg= "";

	do {
		const res= parseExpression(ctx);
		msg+= res.value;
		if(ctx.lexer.isToken(TOKEN_TYPES.COMMA)) {
			ctx.lexer.next();
			if(!ctx.lexer.token())
				throw new VAParseError("Missing value here");
		}
	} while(ctx.lexer.token() != false)
	
	switch(pragma) {
		case "OUT":
		case "ECHO":
		case "LOG":
			ctx.print(msg, true);
			break;

		case "WARNING":
			ctx.warn(msg);
			break;

		case "ERROR":
			ctx.error(msg);
			break;

	}
}
