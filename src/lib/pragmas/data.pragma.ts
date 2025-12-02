import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { parseExpression } from "../parsers/expression/expression.parser";
import { makeString } from "./string.pragma";

const _log = console.log;

const DATASIZE = {
	DS: 1,
	DB: 1,
	BYTE: 1,
	DW: 2,
	WORD: 2,
	DL: 4,
	LONG: 4,
	DBYTE: -2,
	DWORD: -4,
};

type TDataPragma = keyof typeof DATASIZE;

const hexRe = /[0-9a-fA-F]/;
const wsRe = /\s/;
const commentRe = /\s*;.*?$/;

export function readHexLine(textLine: string, isFromBlock?: boolean) {
	const bytes = [];
	let idx = 0;
	const getChar = () => {
		if (idx >= hexLine.length) return false;

		const chr = hexLine[idx++];
		if (wsRe.test(chr)) return false;
		if (!hexRe.test(chr)) throw new VAParseError("Invalid character in Hex data");

		return chr;
	};

	const hexLine = textLine.replace(commentRe, "");

	while (idx < hexLine.length) {
		const chr0 = getChar();
		if (chr0 === null) break;
		if (chr0 === false) continue;
		const chr1 = getChar();
		const numStr = chr0 + (chr1 !== false ? chr1 : "");
		bytes.push(Number.parseInt(numStr, 16));
	}

	if (!isFromBlock && bytes.length === 0) throw new VAParseError("HEX(1): Missing Hex data");

	return bytes;
}

function readHexBlock(ctx: Context) {
	const bytes = [];
	while (true) {
		ctx.lexer.nextLine();

		if (ctx.lexer.eof()) throw new VAParseError("Missing .end for .hex");

		if (ctx.lexer.isToken(TOKEN_TYPES.DOT)) {
			ctx.lexer.next();
			if (!ctx.lexer.isIdentifier("END")) throw new VAParseError("Illegal pragma here");
			ctx.lexer.next();
			break;
		}
		const hexLine = ctx.lexer.line().trim();
		if (hexLine.length) bytes.push(...readHexLine(hexLine, true));
	}

	if (bytes.length === 0) throw new VAParseError("HEX(2): Missing Hex data");

	return bytes;
}

/*
	- line version
	.hex <hex bytes>

	- block version
	.hex
		<hex bytes>
	.end
 */
export function processHex(ctx: Context) {
	const token = ctx.lexer.token();
	// no parm ? so block version
	if (!token) {
		ctx.code.emits(ctx.pass, readHexBlock(ctx));
	} else {
		const hexLine = ctx.lexer.line().slice(token.posInLine);
		ctx.code.emits(ctx.pass, readHexLine(hexLine, false));
		// as we didn't consume the tokens, we need to skip them
		while (ctx.lexer.next());
	}

	// ctx.lexer.nextLine();
	return true;
}

export function pushNumber(list: number[], num: number, endianSize: number) {
	const dataSize = Math.abs(endianSize);
	let numberValue = num;

	numberValue &= dataSize === 4 ? 0xffffffff : 0xffff;
	const byte3 = (numberValue >> 24) & 0xff;
	const byte2 = (numberValue >> 16) & 0xff;
	const byte1 = (numberValue >> 8) & 0xff;
	const byte0 = numberValue & 0xff;

	switch (endianSize) {
		// byte
		case 1:
			if (num > 0xff) throw new VAParseError("Data Overflow - 8bits expected");
			list.push(byte0);
			break;

		// word (2 bytes) little endian
		case 2:
			if (num > 0xffff) throw new VAParseError("Data Overflow - 16bits expected");
			list.push(byte0, byte1);
			break;

		// long (4 bytes) little endian
		case 4:
			list.push(byte0, byte1, byte2, byte3);
			break;

		// long (4 bytes) big endian
		case -4:
			list.push(byte3, byte2, byte1, byte0);
			break;

		// word (2 bytes) big endian
		case -2:
			list.push(byte1, byte0);
			break;
	}
}

export function processData(ctx: Context, pragma: string) {
	const endianSize = DATASIZE[pragma as TDataPragma];
	let list: number[] = [];
	while (true) {
		// ctx.pass > 1 && log("processData BEGIN");

		const res = parseExpression(ctx);

		// log(`processData END ${getTypeName(res?.type??0)} ${JSON.stringify(res)}`);

		switch (res?.type) {
			case TOKEN_TYPES.NUMBER:
				pushNumber(list, res.number, endianSize);
				break;
			case TOKEN_TYPES.STRING:
				list = list.concat(makeString(ctx, res.string, { charSize: endianSize }));
				break;
			default:
				if (ctx.pass === 1) {
					pushNumber(list, 0, endianSize);
				} else {
					throw new VAParseError(`DATA: Invalid Type "${JSON.stringify(res)}". Must be a string or a number`);
				}
		}

		if (!ctx.lexer.isToken(TOKEN_TYPES.COMMA)) break;

		ctx.lexer.next();
	}

	if (list.length === 0) throw new VAParseError("Missing data");

	ctx.code.emits(ctx.pass, list);

	return true;
}
