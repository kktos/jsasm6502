import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { isPragmaBlock, isPragmaToken } from "./pragma.tokens.js";

isPragmaToken;

const TOKENS_CHEAPLABEL = [TOKEN_TYPES.COLON, TOKEN_TYPES.BANG];

function isPragma(lexer, pragma) {
	return (
		lexer.isToken(TOKEN_TYPES.DOT) &&
		lexer.isLookahead(TOKEN_TYPES.IDENTIFIER) &&
		lexer.lookahead().value === pragma
	);
}

isPragmaBlock;
export function readBlock(ctx, splitToken) {
	let block = "";
	const blocks = [];
	let blockLevel = 1;

	while (!ctx.lexer.eof()) {
		ctx.lexer.nextLine();

		// skip labels ( !, :, name[:], @name )
		if (TOKENS_CHEAPLABEL.includes(ctx.lexer.token().type)) ctx.lexer.next();
		else if (ctx.lexer.token().type === TOKEN_TYPES.IDENTIFIER) {
			ctx.lexer.next();
			if (ctx.lexer.token().type === TOKEN_TYPES.COLON) ctx.lexer.next();
		} else if (ctx.lexer.token().type === TOKEN_TYPES.AT) {
			ctx.lexer.next();
			if (ctx.lexer.token().type !== TOKEN_TYPES.IDENTIFIER)
				throw new VAParseError("LABEL: Cheap label without name");
			ctx.lexer.next();
		}

		// if(isPragmaToken(ctx))
		// 	console.log("---", ctx.lexer.pos(), ctx.lexer.line(),blockLevel );

		if (isPragmaToken(ctx) && isPragmaBlock(ctx.lexer.lookahead().value)) {
			blockLevel++;
		}

		if (isPragma(ctx.lexer, splitToken) && blockLevel === 1) {
			blocks.push(block === "" ? undefined : block);
			block = "";
			// console.log({blocks, blockLevel, line:ctx.lexer.line(), pos:ctx.lexer.pos()});
			continue;
		}

		if (isPragma(ctx.lexer, "END")) {
			ctx.lexer.next();
			ctx.lexer.next();
			blockLevel--;
			if (!blockLevel) break;
		}

		block += `${ctx.lexer.line()}\n`;
	}
	blocks.push(block === "" ? undefined : block);

	return blocks;
}
