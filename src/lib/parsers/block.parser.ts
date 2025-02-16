import type { Context } from "../context.class";
import { dbgStringList } from "../helpers/debug";
import { VAParseError } from "../helpers/errors.class";
import type { Lexer } from "../lexer/lexer.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { isBlockPragma } from "./pragma.tokens";

const log = console.log;

const TOKENS_LOCALLABEL = [TOKEN_TYPES.COLON, TOKEN_TYPES.BANG];

export function isPragma(lexer: Lexer, pragma: string) {
	return lexer.isToken(TOKEN_TYPES.DOT) && lexer.isLookahead(TOKEN_TYPES.IDENTIFIER, pragma);
}

export type TReadBlockOptions = {
	splitToken?: string;
	isClikeBlock?: boolean;
	wantRaw?: boolean;
};

export function readBlock(ctx: Context, opts?: TReadBlockOptions) {
	let block = "";
	const blocks = [];
	let blockLevel = 1;
	const blocksCStyleFlag: boolean[] = [];
	let currentLine: string;

	const popLastStyle = () => {
		return (blocksCStyleFlag.length > 1 ? blocksCStyleFlag.pop() : blocksCStyleFlag[0]) ?? false;
	};

	// log("READBLOCK", ctx.lexer.line().trim(), ctx.lexer.eol()?"EOL!":"", ctx.lexer.token());
	// log("READBLOCK", dbgStringList(ctx.lexer.lines().slice(ctx.lexer.pos().line-1)));

	if (ctx.lexer.eol()) {
		ctx.lexer.nextLine();
	} else {
		if (!ctx.lexer.isToken(TOKEN_TYPES.LEFT_CURLY_BRACE)) throw new VAParseError("BLOCK: Invalid characters");
	}

	let isCStyleBlock =
		opts?.isClikeBlock !== undefined ? opts?.isClikeBlock : ctx.lexer.isToken(TOKEN_TYPES.LEFT_CURLY_BRACE);
	blocksCStyleFlag.push(isCStyleBlock);

	if (isCStyleBlock) {
		ctx.lexer.next();
		if (ctx.lexer.eol()) {
			ctx.lexer.nextLine();
		}
	}

	if (opts?.wantRaw) {
		currentLine = ctx.lexer.line();
	} else {
		const posInLine = ctx.lexer.token()?.posInLine;
		currentLine = ctx.lexer.line().slice(posInLine);
	}

	// log("BLOCK", isCStyleBlock ? "Clike" : "ASM");

	while (true) {
		// log(`BLOCK CURRENTLINE:<${blockLevel}>.${isCStyleBlock ? "C  " : "ASM"} : "${currentLine}"`);
		// log(`BLOCK Cstyles:<${blocksCStyleFlag.join(",")}>`);

		// skip labels ( !, :, name[:], @name )

		const token = ctx.lexer.token();

		// log("BLOCK", token, blockLevel, blocksCStyleFlag.at(-1));

		if (token) {
			switch (token?.type) {
				case TOKEN_TYPES.IDENTIFIER:
					ctx.lexer.next();
					if (ctx.lexer.isToken(TOKEN_TYPES.COLON)) ctx.lexer.next();
					break;

				default:
					if (token.type && TOKENS_LOCALLABEL.includes(token.type)) ctx.lexer.next();
					break;
			}
		}

		if (isBlockPragma(ctx)) {
			// log("BLOCK");

			// const pragma= ctx.lexer.lookahead();

			// special case for ELSE as it closes a block and start a new one
			if (isPragma(ctx.lexer, "ELSE")) {
				if (!isCStyleBlock) blockLevel--;

				isCStyleBlock = popLastStyle();

				// log("BLOCK ELSE", blockLevel, isCStyleBlock);

				if (!blockLevel) break;
				ctx.lexer.next();
				ctx.lexer.next();
			}

			// log("BLOCK look for {");

			isCStyleBlock = false;
			const endIdx = ctx.lexer.tokens.length - 1;
			for (let index = endIdx; index > -1; index--) {
				const tok = ctx.lexer.tokens[index];

				// log("BLOCK", index, tok, endIdx);

				if (tok.type === TOKEN_TYPES.LEFT_CURLY_BRACE) {
					isCStyleBlock = true;

					// log("BLOCK found one at", index);

					if (index !== endIdx) throw new VAParseError("BLOCK: Start block { should be the last on the line");
				}
			}
			blockLevel++;
			blocksCStyleFlag.push(isCStyleBlock);

			// log(`BLOCK            :<${blockLevel}>.${isCStyleBlock ? "C  " : "ASM"}`);
		}

		// log(`BLOCK CStyle:${blocksCStyleFlag.at(-1)} Token:${ctx.lexer.token()}`);

		if (blocksCStyleFlag.at(-1)) {
			if (ctx.lexer.isToken(TOKEN_TYPES.RIGHT_CURLY_BRACE)) {
				blockLevel--;

				// log("BLOCK endBlock", blockLevel);

				ctx.lexer.next();

				// log("BLOCK else ?", ctx.lexer.token());

				isCStyleBlock = popLastStyle();

				// log("BLOCK endBlock", blockLevel);

				if (!blockLevel) break;
			}
		} else if (isPragma(ctx.lexer, "END")) {
			ctx.lexer.next();
			ctx.lexer.next();
			blockLevel--;
			isCStyleBlock = popLastStyle();
			if (!blockLevel) break;
		}

		block += `${currentLine}\n`;

		// log(`BLOCK <${block}>`);

		if (ctx.lexer.eof()) break;

		ctx.lexer.nextLine();
		currentLine = ctx.lexer.line();

		// log(`BLOCK LOOP <${currentLine.trim()}> ${ctx.lexer.token()}`);
	}

	// log("BLOCK END", dbgStringList(block.trimEnd().split("\n")));

	if (blockLevel > 0) throw new VAParseError(`BLOCK: Missing end block ${isCStyleBlock ? "}" : ".end"}`);

	if (block !== "") blocks.push(block.trimEnd());

	return blocks;
}
