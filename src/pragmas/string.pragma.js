import { ET_P, ET_S, logError, logLine } from "../log.js";
import { nextLine } from "../tokenizer.js";
import { compile, getHexByte, getHexWord } from "../utils.js";
import { processNumber } from "./data.pragma.js";

// const reStr= /\s+(".*?")\s*$/i;
const quotes= ["'", '"'];

export function encodePetscii(b) {
	if (b >= 0x41 && b <= 0x5A) return b | 0x80; // A..Z
	if (b >= 0x61 && b <= 0x7A) return b - 0x20; // a..z
	return b;
}

export function encodeCommodoreScreenCode(b) {
	if (b >= 0x61 && b <= 0x7A) return b-0x60; // a..z
	if (b >= 0x5B && b <= 0x5F) return b-0x40; // [\]^_
	if (b == 0x60) return 0x40;                // `
	if (b == 0x40) return 0;                   // @
	return b;
}

export function encodeAscii(b) {
	return b;
}

function processString(ctx, text, pragma, options) {
	const cbBuffer= [];
	const txt= text.slice(1,-1);
	let i, tmax;

	ctx.pict+= '"';
	for (i=0, tmax=txt.length-1; i<=tmax; i++) {
		let c=txt.charAt(i), cc=c.charCodeAt(0);
		if (options.convertPiLocal && v==0x03C0)
			v= 0xff; //CBM pi
		if (c=='"') {
			if (i!=tmax) {
				ctx.pict+= txt.substring(i+1).replace(/^(\s)?\s*(.).*/,'$1"$2');
				logError(ctx, ET_S,'unexpected extra character');
				return false;
			}
			break;
		}
		ctx.pict+=c;
		if (cc>0xff) {
			logError(ctx, ET_P, 'illegal character');
			return false;
		}
		if (ctx.pass==2) {

			if(options.wannaLeadingLen) {
				options.wannaLeadingLen= false;
				compile(ctx, ctx.pc, tmax);
				ctx.addrStr= getHexWord(ctx.pc);
				ctx.pict= '.DB $'+getHexByte(tmax);
				ctx.pc++;
				ctx.asm= getHexByte(tmax);
				logLine(ctx);

				ctx.addrStr= getHexWord(ctx.pc);
				ctx.pict+= '.'+pragma+' "';
			}

			cc= options.encoder(cc);
			cbBuffer.push(getHexByte(cc));
			compile(ctx, ctx.pc, cc);
			if (cbBuffer.length==3) {
				ctx.asm= cbBuffer.join(' ');
				cbBuffer.length=0;
				if (i==tmax-1 && txt.charAt(tmax)=='"')
					ctx.pict+= '"';
				logLine(ctx);
				ctx.addrStr= getHexWord(ctx.pc);
				ctx.pict+= '.'+pragma+' "';
			}
		}
		else if (i%40==39) {
			logLine(ctx);
			ctx.addrStr= getHexWord(ctx.pc);
			ctx.pict+= '.'+pragma+' "';
		}
		ctx.pc++;
	}
	ctx.pict+= '"';

	switch(ctx.pass) {
		case 1:
			if(i%40 != 39)
				logLine(ctx);
			break;

		case 2:
			if(cbBuffer.length) {
				ctx.asm= cbBuffer.join(' ');
				logLine(ctx);
			}
			if(options.wannaTrailingZero) {
				compile(ctx, ctx.pc, 0);
				ctx.addrStr= getHexWord(ctx.pc);
				ctx.pict= '.DB $00';
				ctx.pc++;
				ctx.asm= "00";
				logLine(ctx);
			}
			break;
	}
}

export function processText(ctx, pragma) {
	let options= {};

	if (ctx.pass==2) {

		options.encoder= ctx.charEncoding;
		options.convertPiLocal= ctx.convertPi;

		switch(pragma) {
			case "CSTRING":
				options.wannaTrailingZero= true;
				pragma= "TEXT";
				break;

			case "PSTRING":
				options.wannaLeadingLen= true;
				pragma= "TEXT";
				break;

			case "ASCII":
				options.encoder= encodeAscii;
				options.convertPiLocal= false;
				break;
			case "PETSCII":
				options.encoder= encodePetscii;
				options.convertPiLocal= true;
				break;
			case "PETSCR":
			case "C64SCR":
				options.encoder= encodeCommodoreScreenCode;
				options.convertPiLocal= true;
				break;
		}
	}

	let isTextOut= false;
	for(let idx= ctx.ofs; idx<ctx.sym.length; idx++) {
		const arg= ctx.sym[idx];
		if(quotes.includes(arg[0])) {
			if(!isTextOut) {
				isTextOut= true;
				ctx.addrStr= getHexWord(ctx.pc);
				ctx.pict+= "."+pragma+' ';
			}
			processString(ctx, arg, pragma, options);
		} else
			processNumber(ctx, "DB", arg);
	}

	nextLine(ctx);
	return true;
}
