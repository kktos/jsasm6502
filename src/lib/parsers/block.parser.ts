import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { Lexer } from "../lexer/lexer.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { isBlockPragma } from "./pragma.tokens";

const log = console.log;

const TOKENS_LOCALLABEL = [TOKEN_TYPES.COLON, TOKEN_TYPES.BANG];

function isPragma(lexer: Lexer, pragma: string) {
	return lexer.isToken(TOKEN_TYPES.DOT) && lexer.isLookahead(TOKEN_TYPES.IDENTIFIER, pragma);
}

export type TReadBlockOptions = {
	splitToken?: string;
	isClikeBlock?: boolean;
};

export function readBlock(ctx: Context, opts?: TReadBlockOptions) {
	let block = "";
	const blocks = [];
	let blockLevel = 1;
	const blocksCStyleFlag = [];

	blocksCStyleFlag.push(opts?.isClikeBlock);

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

				// case TOKEN_TYPES.AT:
				// 	ctx.lexer.next();
				// 	if (ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER)) throw new VAParseError("LABEL: Cheap label without name");
				// 	ctx.lexer.next();
				// 	break;

				default:
					if (token.type && TOKENS_LOCALLABEL.includes(token.type)) ctx.lexer.next();
					break;
			}
		}

		if (isBlockPragma(ctx)) {
			// log("BLOCK");

			let isClikeBlock = false;
			const endIdx = ctx.lexer.tokens.length - 1;
			for (let index = endIdx; index > -1; index--) {
				const tok = ctx.lexer.tokens[index];

				// log("BLOCK", index, tok, endIdx);

				if (tok.type === TOKEN_TYPES.LEFT_CURLY_BRACE) {
					isClikeBlock = true;
					if (index !== endIdx) throw new VAParseError("BLOCK: Start block { should be the last on the line");
				}
			}
			blockLevel++;
			blocksCStyleFlag.push(isClikeBlock);
		}

		// log("BLOCK", blockLevel, blocksCStyleFlag.at(-1));

		if (blocksCStyleFlag.at(-1)) {
			// log("BLOCK endBlock ?", ctx.lexer.token());

			if (ctx.lexer.isToken(TOKEN_TYPES.RIGHT_CURLY_BRACE)) {
				ctx.lexer.next();

				// log("BLOCK else ?", ctx.lexer.token());

				if (opts?.splitToken && isPragma(ctx.lexer, opts?.splitToken)) {
					ctx.lexer.next();
					ctx.lexer.next();

					// log("BLOCK else { ?", ctx.lexer.token());

					if (!ctx.lexer.isToken(TOKEN_TYPES.LEFT_CURLY_BRACE)) throw new VAParseError("BLOCK: Missing Start block {");

					ctx.lexer.next();

					if (!ctx.lexer.eol()) throw new VAParseError("BLOCK: Start block { should be the last on the line");

					if (blockLevel === 1) {
						blocks.push(block === "" ? undefined : block);
						block = "";
						continue;
					}
				} else {
					blockLevel--;
					blocksCStyleFlag.pop();
					if (!blockLevel) break;
				}
			}
		} else if (opts?.splitToken && isPragma(ctx.lexer, opts?.splitToken) && blockLevel === 1) {
			blocks.push(block === "" ? undefined : block);
			block = "";
			// console.log({blocks, blockLevel, line:ctx.lexer.line(), pos:ctx.lexer.pos()});
			continue;
		}

		if (isPragma(ctx.lexer, "END")) {
			ctx.lexer.next();
			ctx.lexer.next();
			blockLevel--;
			blocksCStyleFlag.pop();
			if (!blockLevel) break;
		}

		block += `${ctx.lexer.line()}\n`;
	}

	// log("readblock", block);

	if (blockLevel > 0) throw new VAParseError("BLOCK: Missing .end");

	blocks.push(block === "" ? undefined : block);

	return blocks;
}
