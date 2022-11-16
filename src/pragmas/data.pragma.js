import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { parseExpression } from "../parsers/expression.parser.js";
import { makeString } from "./string.pragma.js";

const DATASIZE= {
	DB: 1,
	DW: 2,
	DL: 4,
	DBYTE: -2,
	DWORD: -4,
};
const hexRe= /[0-9a-fA-F]/;
const wsRe= /\s/;
const commentRe= /\s*;.*?$/;

export function readHexLine(hexLine, isFromBlock) {
	const bytes= [];
	let idx= 0;
	const getChar= () => {
		if(idx>=hexLine.length)
			return false;

		const chr= hexLine[idx++];
		if(wsRe.test(chr))
			return false;
		if(!hexRe.test(chr))
			throw new VAParseError("Invalid character in Hex data");

		return chr;
	};

	hexLine= hexLine.replace(commentRe, "");

	while(idx<hexLine.length) {
		let chr0= getChar();
		if(chr0 === null)
			break;
		if(chr0 === false)
			continue;
		let chr1= getChar();
		let numStr= chr0 + (chr1 !== false ? chr1 : "");
		bytes.push( Number.parseInt(numStr, 16) );
	}

	if(!isFromBlock && bytes.length == 0)
		throw new VAParseError(`HEX(1): Missing Hex data`);

	return bytes;
}

function readHexBlock(ctx) {
	const bytes= [];
	while(true) {
		ctx.lexer.nextLine();

		if(ctx.lexer.eof())
			throw new VAParseError("Missing .end for .hex");

		if(ctx.lexer.isToken(TOKEN_TYPES.DOT)) {
			ctx.lexer.next();
			if(!ctx.lexer.isIdentifier("END"))
				throw new VAParseError("Illegal pragma here");
			ctx.lexer.next();
			break;
		}
		const hexLine= ctx.lexer.line().trim();
		if(hexLine.length)
			bytes.push(...readHexLine(hexLine, true));
	}

	if(bytes.length == 0)
		throw new VAParseError("HEX(2): Missing Hex data");

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
export function processHex(ctx, pragma) {
	// no parm ? so block version
	if(!ctx.lexer.token()) {
		ctx.code.emits(ctx.pass, readHexBlock(ctx));
	} else {

		const hexLine= ctx.lexer.line().slice(ctx.lexer.token().posInLine);
		ctx.code.emits(ctx.pass, readHexLine(hexLine, false));
		// as we didn't consume the tokens, we need to skip them
		while(ctx.lexer.next());
	}

	// ctx.lexer.nextLine();

}

export function pushNumber(list, parm, endianSize) {
	const dataSize= Math.abs(endianSize);
	let numberValue= parm.value;

	numberValue&= dataSize==4 ? 0xffffffff : 0xffff;
	const byte3= (numberValue>>24) & 0xff;
	const byte2= (numberValue>>16) & 0xff;
	const byte1= (numberValue>>8) & 0xff;
	const byte0= numberValue & 0xff;

	switch(endianSize) {
		// byte
		case 1:
			if(parm.value>0xFF)
				throw new VAParseError("Data Overflow - 8bits expected");
			list.push(byte0);
			break;

		// word (2 bytes) little endian
		case 2:
			if(parm.value>0xFFFF)
				throw new VAParseError("Data Overflow - 16bits expected");
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

export function processData(ctx, pragma) {
	const endianSize= DATASIZE[pragma];
	let list= [];
	while(true) {

		// console.log("processData", ctx.lexer.token());

		const res= parseExpression(ctx);

		// console.log("processData", res);

		switch(res.type) {
			case TOKEN_TYPES.NUMBER:
				pushNumber(list, res, endianSize);
				break;
			case TOKEN_TYPES.STRING:
				list= list.concat(makeString(ctx, res.value, { charSize: endianSize }));
				break;
			default:
				throw new VAParseError(`DATA: Invalid Type "${res.type}". Must be a string or a number`);
		}

		if(!ctx.lexer.isToken(TOKEN_TYPES.COMMA))
			break;

		ctx.lexer.next();
	}

	if(list.length == 0)
		throw new VAParseError("Missing data");

	ctx.code.emits(ctx.pass, list);
}
