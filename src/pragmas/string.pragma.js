import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";

const CSTR_TOKENS= ["CSTRING", "CSTR", "ASCIIZ"];
const PSTR_TOKENS= ["PSTRING", "PSTR"];

export function processText(ctx, pragma) {
	const opts= {
		hasTrailingZero: CSTR_TOKENS.includes(pragma),
		hasLeadingLength: PSTR_TOKENS.includes(pragma),
		charSize: 1
	};

	while(ctx.lexer.token()) {
		const buffer= makeString(ctx, ctx.lexer.token().value, opts);

		ctx.code.emits(ctx.pass, buffer, true);

		ctx.lexer.next();
		if(!ctx.lexer.isToken(TOKEN_TYPES.COMMA))
			return false;

		ctx.lexer.next();
	}

	return true;

}

export function makeString(ctx, str, opts) {
	const buffer= [];
	let char;

	for(let idx= 0; idx < str.length; idx++) {
		if(opts.charSize<0)
			for(let padIdx= 1; padIdx < -opts.charSize; padIdx++)
				buffer.push(0);

		char= str.charCodeAt(idx);
		if(char >= 0x100)
			throw new VAParseError("STRING: Invalid character " + str[idx]);

		if(char == 92) {// \
			idx++;
			if(idx >= str.length)
				throw new VAParseError("STRING: Invalid character " + str[idx-1]);

			switch(str[idx]) {
				case "\\": char= "\\".charCodeAt(0); break;
				case "n": char= "\n".charCodeAt(0); break;
				case "r": char= "\r".charCodeAt(0); break;
				case "t": char= "\t".charCodeAt(0); break;
				case "b": char= "\b".charCodeAt(0); break;
				case "f": char= "\f".charCodeAt(0); break;
				case "'": char= "'".charCodeAt(0); break;
				case '"': char= '"'.charCodeAt(0); break;
				case '0': char= 0; break;
				case 'x': {
					idx+=2 ;
					if(idx >= str.length)
						throw new VAParseError("STRING: Invalid character " + str[idx-2]);
					const hex= str.slice(idx-1, idx+1);
					char= parseInt("0x" + hex, 16);
					if(isNaN(char))
						throw new VAParseError("STRING: Invalid hexa value " + hex);
					break;
				}
				default:
					throw new VAParseError("STRING: Invalid character " + str[idx]);
			}
		}

		if(ctx.charMap)
			char= ctx.charMap[char];
			
		buffer.push( char );

		if(opts.charSize>0)
			for(let padIdx= 1; padIdx < opts.charSize; padIdx++)
				buffer.push(0);
	}
	
	if(opts.hasTrailingZero)
		buffer.push(0);

	if(opts.hasLeadingLength)
		buffer.unshift(buffer.length);

	return buffer;
}

// import { ET_P, ET_S, logError, logLine } from "../log.js";
// import { nextLine } from "../tokenizer.js";
// import { compile, getHexByte, getHexWord } from "../utils.js";
// import { processNumber } from "./data.pragma.js";

// // const reStr= /\s+(".*?")\s*$/i;
// const quotes= ["'", '"'];

// export function encodePetscii(b) {
// 	if (b >= 0x41 && b <= 0x5A) return b | 0x80; // A..Z
// 	if (b >= 0x61 && b <= 0x7A) return b - 0x20; // a..z
// 	return b;
// }

const petscii= [
	0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
	0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F,
	0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F,
	0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3E, 0x3F,
	0x40, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6E, 0x6F,
	0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x5B, 0x5C, 0x5D, 0x5E, 0x5F,
	0x60, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F,
	0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x7B, 0x7C, 0x7D, 0x7E, 0x7F,
	0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F,
	0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F,
	0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF,
	0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF,
	0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xCB, 0xCC, 0xCD, 0xCE, 0xCF,
	0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xDB, 0xDC, 0xDD, 0xDE, 0xDF,
	0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
	0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF
];

// export function encodeCommodoreScreenCode(b) {
// 	if (b >= 0x61 && b <= 0x7A) return b-0x60; // a..z
// 	if (b >= 0x5B && b <= 0x5F) return b-0x40; // [\]^_
// 	if (b == 0x60) return 0x40;                // `
// 	if (b == 0x40) return 0;                   // @
// 	return b;
// }

// export function encodeAscii(b) {
// 	return b;
// }

// function processString(ctx, text, pragma, options) {
// 	const cbBuffer= [];
// 	const txt= text.slice(1,-1);
// 	let i, tmax;

// 	ctx.pict+= '"';
// 	for (i=0, tmax=txt.length-1; i<=tmax; i++) {
// 		let c=txt.charAt(i), cc=c.charCodeAt(0);
// 		if (options.convertPiLocal && v==0x03C0)
// 			v= 0xff; //CBM pi
// 		if (c=='"') {
// 			if (i!=tmax) {
// 				ctx.pict+= txt.substring(i+1).replace(/^(\s)?\s*(.).*/,'$1"$2');
// 				logError(ctx, ET_S,'unexpected extra character');
// 				return false;
// 			}
// 			break;
// 		}
// 		ctx.pict+=c;
// 		if (cc>0xff) {
// 			logError(ctx, ET_P, 'illegal character');
// 			return false;
// 		}
// 		if (ctx.pass==2) {

// 			if(options.wannaLeadingLen) {
// 				options.wannaLeadingLen= false;
// 				compile(ctx, ctx.pc, tmax);
// 				ctx.addrStr= getHexWord(ctx.pc);
// 				ctx.pict= '.DB $'+getHexByte(tmax);
// 				ctx.pc++;
// 				ctx.asm= getHexByte(tmax);
// 				logLine(ctx);

// 				ctx.addrStr= getHexWord(ctx.pc);
// 				ctx.pict+= '.'+pragma+' "';
// 			}

// 			cc= options.encoder(cc);
// 			cbBuffer.push(getHexByte(cc));
// 			compile(ctx, ctx.pc, cc);
// 			if (cbBuffer.length==3) {
// 				ctx.asm= cbBuffer.join(' ');
// 				cbBuffer.length=0;
// 				if (i==tmax-1 && txt.charAt(tmax)=='"')
// 					ctx.pict+= '"';
// 				logLine(ctx);
// 				ctx.addrStr= getHexWord(ctx.pc);
// 				ctx.pict+= '.'+pragma+' "';
// 			}
// 		}
// 		else if (i%40==39) {
// 			logLine(ctx);
// 			ctx.addrStr= getHexWord(ctx.pc);
// 			ctx.pict+= '.'+pragma+' "';
// 		}
// 		ctx.pc++;
// 	}
// 	ctx.pict+= '"';

// 	switch(ctx.pass) {
// 		case 1:
// 			if(i%40 != 39)
// 				logLine(ctx);
// 			break;

// 		case 2:
// 			if(cbBuffer.length) {
// 				ctx.asm= cbBuffer.join(' ');
// 				logLine(ctx);
// 			}
// 			if(options.wannaTrailingZero) {
// 				compile(ctx, ctx.pc, 0);
// 				ctx.addrStr= getHexWord(ctx.pc);
// 				ctx.pict= '.DB $00';
// 				ctx.pc++;
// 				ctx.asm= "00";
// 				logLine(ctx);
// 			}
// 			break;
// 	}
// }

// export function processText(ctx, pragma) {
// 	let options= {};

// 	if (ctx.pass==2) {

// 		options.encoder= ctx.charEncoding;
// 		options.convertPiLocal= ctx.convertPi;

// 		switch(pragma) {
// 			case "CSTRING":
// 				options.wannaTrailingZero= true;
// 				pragma= "TEXT";
// 				break;

// 			case "PSTRING":
// 				options.wannaLeadingLen= true;
// 				pragma= "TEXT";
// 				break;

// 			case "ASCII":
// 				options.encoder= encodeAscii;
// 				options.convertPiLocal= false;
// 				break;
// 			case "PETSCII":
// 				options.encoder= encodePetscii;
// 				options.convertPiLocal= true;
// 				break;
// 			case "PETSCR":
// 			case "C64SCR":
// 				options.encoder= encodeCommodoreScreenCode;
// 				options.convertPiLocal= true;
// 				break;
// 		}
// 	}

// 	let isTextOut= false;
// 	for(let idx= ctx.ofs; idx<ctx.sym.length; idx++) {
// 		const arg= ctx.sym[idx];
// 		if(quotes.includes(arg[0])) {
// 			if(!isTextOut) {
// 				isTextOut= true;
// 				ctx.addrStr= getHexWord(ctx.pc);
// 				ctx.pict+= "."+pragma+' ';
// 			}
// 			processString(ctx, arg, pragma, options);
// 		} else
// 			processNumber(ctx, "DB", arg);
// 	}

// 	nextLine(ctx);
// 	return true;
// }
