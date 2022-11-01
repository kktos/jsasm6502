import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { isPragmaBlock, isPragmaToken } from "../parsers/pragma.parser.js";

function isEnd(lexer) {
	return 	lexer.isToken(TOKEN_TYPES.DOT) &&
			lexer.isLookahead(TOKEN_TYPES.IDENTIFIER) &&
			lexer.lookahead().value == "END";
}

export function readBlock(ctx) {
	let block= "";
	let blockLevel= 1;
	
	while(!ctx.lexer.eof()) {
		ctx.lexer.nextLine();
		
		if(isPragmaToken(ctx) && isPragmaBlock(ctx.lexer.lookahead().value))
			blockLevel++;

		if(isEnd(ctx.lexer)) {
			ctx.lexer.next();
			ctx.lexer.next();
			blockLevel--;
			if(!blockLevel)
				break;
		}

		block+= ctx.lexer.line()+"\n";
	}
	return block;
}