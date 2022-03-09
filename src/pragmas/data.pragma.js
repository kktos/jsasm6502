import { getExpression } from "../expression.js";
import { ET_P, ET_S, logError, logLine } from "../log.js";
import { compile, getHexByte, getHexWord, hexPrefix } from "../utils.js";
import { readBlock } from "./block.utils.js";

const DATASIZE= {
	DB: 1,
	DW: 2,
	DL: 4,
	DBYTE: -2,
	DWORD: -4,
};

function symToArgs(sym, ofs) {
	let args= [],
		chunk;

	for (let i=ofs; i<sym.length; i++) {
		let s=sym[i], quote=false, k=0;
		chunk='';
		while(k<s.length) {
			let c= s.charAt(k++);
			if(c=='"') {
				chunk+= '"';
				quote= !quote;
				if(!quote) {
					args.push(chunk);
					chunk='';
				}
			} else if(!quote) {
				if(c==' ' || c=='\t')
					continue;
				if(c==',') {
					if (chunk.length) args.push(chunk);
					chunk='';
				}
				else {
					chunk+=c;
				}
			}
			else {
				chunk+=c;
			}
		}
		if(chunk.length)
			args.push(chunk);
	}
	return args;
}

/*
	- line version
	.hex <hex bytes>

	- block version
	.hex
		<hex bytes>
	.end
 */
export function hex(ctx, pragma) {

	function processHexLine(numbers) {
		for(const num of numbers) {
			ctx.addrStr= getHexWord(ctx.pc);
			ctx.pict= '.db $'+num;
			if(!/^[0-9A-F]+$/.test(num)) {
				logError(ctx, ET_P, "Not a valid hexa number");
				return false;
			}
			if(ctx.pass == 2) {
				let byte= Number.parseInt(num, 16) & 0xFF;
				compile(ctx, ctx.pc, byte);
				ctx.asm= getHexByte(byte);
				ctx.pict= `.DB ${hexPrefix}${ctx.asm}`;
			}
			logLine(ctx);
			ctx.pc++;
		}
	}

	if(ctx.sym.length-ctx.ofs<1) {
		const bytes= readBlock(ctx);
		bytes.forEach( (hexLine) => {
			processHexLine(hexLine.tokens);
		});
		return true;
	}

	let numbers= symToArgs(ctx.sym, ctx.ofs);
	processHexLine(numbers);
	return true;
}

export function processNumber(ctx, pragma, arg) {

	const endianSize= DATASIZE[pragma];
	const dataSize= Math.abs(endianSize);
	let numberValue= 0;

	ctx.addrStr= getHexWord(ctx.pc);
	ctx.pict= '.'+pragma+' ';

	arg= arg.replace(/^#/,"");
	if(arg=="") {
		logError(ctx, ET_S, 'expression expected');
		return false;
	}

	const r= getExpression(ctx, arg, dataSize==4);
	ctx.pict+= r.pict;
	if (r.error) {
		logError(ctx, r.et||ET_P, r.error);
		return false;
	}
	numberValue= r.v;

	if (ctx.pass==2) {
		numberValue&= dataSize==4 ? 0xffffffff : 0xffff;
		const lb= (numberValue>>8) & 0xff;
		const rb= numberValue & 0xff;

		switch(endianSize) {
			// byte
			case 1:
				compile(ctx, ctx.pc, rb);
				ctx.asm= getHexByte(rb);
				ctx.pict= '.DB '+hexPrefix+getHexByte(rb);
				break;

			// word (2 bytes) little endian
			case 2:
				compile(ctx, ctx.pc, rb);
				compile(ctx, ctx.pc+1, lb);
				ctx.asm= getHexByte(rb)+' '+getHexByte(lb);
				ctx.pict= '.DW '+hexPrefix+getHexWord(numberValue);
				break;

			// long (4 bytes) little endian
			case 4: {
				const	b0= (numberValue>>24) & 0xff,
						b1= (numberValue>>16) & 0xff;

				compile(ctx, ctx.pc, rb);
				compile(ctx, ctx.pc+1, lb);
				ctx.asm= getHexByte(rb)+' '+getHexByte(lb);

				ctx.pict= '.DL '+hexPrefix+getHexByte(b0)+getHexByte(b1)+getHexByte(lb)+getHexByte(rb);
				logLine(ctx);

				ctx.pc+= 2;
				ctx.addrStr= getHexWord(ctx.pc);
				compile(ctx, ctx.pc, b1);
				compile(ctx, ctx.pc+1, b0);
				ctx.asm= getHexByte(b1)+' '+getHexByte(b0);
				ctx.pict= '';
				break;
			}

			// long (4 bytes) big endian
			case -4: {
				const b0= (numberValue>>24)&0xff, b1=(numberValue>>16)&0xff;
				compile(ctx, ctx.pc, b0);
				compile(ctx, ctx.pc+1, b1);
				ctx.asm= getHexByte(b0)+' '+getHexByte(b1);
				ctx.pict= '.DWORD '+hexPrefix+getHexByte(b0)+getHexByte(b1)+getHexByte(lb)+getHexByte(rb);
				logLine(ctx);
				ctx.pc+= 2;
				ctx.addrStr= getHexWord(ctx.pc);
				compile(ctx, ctx.pc, lb);
				compile(ctx, ctx.pc+1, rb);
				ctx.asm= getHexByte(lb)+' '+getHexByte(rb);
				ctx.pict= '';
				break;
			}

			// word (2 bytes) big endian
			case -2:
				compile(ctx, ctx.pc, lb);
				compile(ctx, ctx.pc+1, rb);
				ctx.asm= getHexByte(lb)+' '+getHexByte(rb);
				ctx.pict= '.DBYTE '+hexPrefix+getHexWord(numberValue);
				break;
		}

	}
	logLine(ctx);
	ctx.pc+= dataSize;
	return true;
}

export function processData(ctx, pragma) {

	if(ctx.sym.length-ctx.ofs<1) {
		ctx.addrStr= getHexWord(ctx.pc);
		ctx.pict+= pragma;
		logError(ctx, ET_S, 'expression expected');
		return false;
	}

	const args= symToArgs(ctx.sym, ctx.ofs);
	for(let j=0; j<args.length; j++) {
		const arg= args[j];
		if(!arg)
			return true;
		if(!processNumber(ctx, pragma, arg))
			return false;
	}

	return true;
}
