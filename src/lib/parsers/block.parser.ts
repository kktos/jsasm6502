import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { Lexer } from "../lexer/lexer.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { isPragmaBlock } from "./pragma.tokens";

const TOKENS_LOCALLABEL = [TOKEN_TYPES.COLON, TOKEN_TYPES.BANG];

function isPragma(lexer: Lexer, pragma: string) {
	return lexer.isToken(TOKEN_TYPES.DOT) && lexer.isLookahead(TOKEN_TYPES.IDENTIFIER, pragma);
}

export function readBlock(ctx: Context, splitToken?: string) {
	let block = "";
	const blocks = [];
	let blockLevel = 1;

	while (!ctx.lexer.eof()) {
		ctx.lexer.nextLine();

		// skip labels ( !, :, name[:], @name )

		const token = ctx.lexer.token();

		if (token) {
			switch (token?.type) {
				case TOKEN_TYPES.IDENTIFIER:
					ctx.lexer.next();
					if (ctx.lexer.isToken(TOKEN_TYPES.COLON)) ctx.lexer.next();
					break;

				case TOKEN_TYPES.AT:
					ctx.lexer.next();
					if (ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER)) throw new VAParseError("LABEL: Cheap label without name");
					ctx.lexer.next();
					break;

				default:
					if (token.type && TOKENS_LOCALLABEL.includes(token.type)) ctx.lexer.next();
					break;
			}
		}

		if (isPragmaBlock(ctx)) {
			blockLevel++;
		}

		if (splitToken && isPragma(ctx.lexer, splitToken) && blockLevel === 1) {
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

	if (blockLevel > 0) throw new VAParseError("BLOCK: Missing .end");

	blocks.push(block === "" ? undefined : block);

	return blocks;
}
