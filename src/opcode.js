import { getExpression } from "./expression.js";
import { ET_C, ET_S, logError, logLine } from "./log.js";
import { ADDRMODE, steptab } from "./tables.js";
import { compile, getHexByte, getHexWord, hexPrefix } from "./utils.js";

const expressionStartChars = "$%@&'\"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_*-<>[].";
const operatorChars = "+-*/";

function hasZpgMode(ctx, opc) {
	const instr= ctx.opcodes[opc];
	return instr && (instr[6]>=0 || instr[7]>=0 || instr[8]>=0);
}

function hasWordMode(ctx, opc) {
	const instr= ctx.opcodes[opc];
	return instr && (instr[3]>=0 || instr[4]>=0 || instr[5]>=0);
}

function getAnonymousTarget(ctx, targetSym, anonymousTargets) {
	let offset=0, pict=ctx.pass==1? targetSym.charAt(0):'!';

	while (targetSym.charAt(0)=='!' || targetSym.charAt(0)==':')
		targetSym= targetSym.substring(1);

	for (let i=0; i<targetSym.length; i++) {
		let c= targetSym.charAt(i);
		pict+= c;
		if(c=='+') {
			if(offset<0)
				return { 'pict': pict, 'error': 'illegal sign reversal in offset operand' };
			offset++;
		}
		else if(c=='-') {
			if(offset>0)
				return { 'pict': pict, 'error': 'illegal sign reversal in offset operand' };
			offset--;
		}
		else {
			return { 'pict': pict, 'error': 'unexpected character in offset operand' };
		}
	}

	if(offset==0)
		return { 'pict': pict, 'error': 'missing qualifier in offset operand, "+" or "-" expected' };

	if(ctx.pass==1)
		return { 'pict': pict, 'error': false };

	if(anonymousTargets.length==0)
		return { 'pict': pict, 'error': 'out of range, no anonymous targets defined' };

	let idx = 0;
	while (idx<anonymousTargets.length && anonymousTargets[idx]<=ctx.pc)
		idx++;
	idx--;
	if(offset<0)
		offset++;
	idx+=offset;
	if(idx<0 || idx>=anonymousTargets.length) {
		return { 'pict': pict, 'error': 'anonymous offset out of range (no such anonymous label)' };
	}
	return { 'pict': pict, 'error': false, 'address': anonymousTargets[idx] };
}

export function parseOpcode(ctx, anonymousTargets) {

	// opcode
	let opc= ctx.sym[ctx.ofs],
		dot= ctx.sym[ctx.ofs].indexOf('.'),
		ext= '',
		opctab,
		instr,
		addr,
		mode= 0,
		oper= 0;

	if(dot>0) {
		let rsym;
		[opc, rsym]= opc.split(".");
		if( (rsym=='B' && hasZpgMode(ctx, opc)) || (rsym=='W' && hasWordMode(ctx, opc)) ) {
			ext= rsym.toLowerCase();
			ctx.pict+= (ctx.pass==1) ? opc+'.'+ext : opc;
		}
		else {
			ctx.pict+= opc;
			if(rsym=='B' || rsym=='W') {
				logError(ctx, ET_C, 'invalid extension '+rsym+' for opcode '+opc);
			}
			else {
				logError(ctx, ET_S, 'invalid extension format: '+opc);
			}
			return false;
		}
	}
	else
		ctx.pict+= opc;

	opctab= ctx.opcodes[opc];

	if(opctab==null) {
		logError(ctx, ET_S, ctx.ofs==0? 'opcode or label expected':'opcode expected');
		return false;
	}

	addr= ctx.sym[ctx.ofs+1];

	if(typeof addr=='undefined') {
		// implied
		const addrmode = (opctab[0]<0 && opctab[1]>=0)? 1:0;
		if(addrmode==1 && ctx.pass==2) ctx.pict+=' A';
		if(opctab[addrmode]<0) {
			logError(ctx, ET_S,'unexpected end of line, operand expected');
			return false;
		}
		else if(ctx.pass==2) {
			// compile
			ctx.asm= getHexByte(opctab[addrmode]);
			compile(ctx, ctx.pc, opctab[addrmode]);
		}
		logLine(ctx);
		ctx.pc++;
	}
	else {
		let a1= addr.charAt(0),
			b1= 0,
			b2= addr.length,
			coda= '';

		if(addr=='A' && opctab[1]>=0) {
			ctx.pict+= ' A';
			b1= 1;
			mode= 1;
		}
		else if(a1=='#') {
			ctx.pict+=' #';
			b1= 1;
			mode= 2;
		}
		else if(a1=='*') {
			if((b2>1 && operatorChars.indexOf(addr.charAt(1))<0) || addr=='**') {
				ctx.pict+= ' *';
				b1= 1;
				mode= 6;
			}
			else {
				ctx.pict+= ' ';
				mode= (opctab[ADDRMODE.REL]<0) ? 3 : 12;
			}
		}
		// else if(a1=='(') {
		else if(addr == '(') {
			ctx.pict+= ' (';
			b1= 1;
			mode= 9;
		}
		else {
			ctx.pict+= ' ';
			mode= (opctab[ADDRMODE.REL]<0) ? 3 : 12;
		}

		if(ext) {
			if(ext=='b' && (mode==3 || mode==6)) {
				mode=6;
			}
			else if(mode!=3) {
				logError(ctx, ET_P,'extension conflicts with operand type');
				return false;
			}
		}

		if(mode==9) {

			// lda ($10,x)
			// jmp ($1000,x)
			//   [1]= "(" [2]= address [3]= "X" [4]= ")"

			// lda ($10),y
			//   [1]= "(" [2]= address [3]= ")" [4]= "Y"

			// jmp ($1000)
			//   [1]= "(" [2]= address [3]= ")"

			if(ctx.sym[ctx.ofs+4] == ")") {

				if(ctx.sym[ctx.ofs+3] != "X") {
					logError(ctx, ET_S,'invalid address format');
					return false;
				}
				mode= opc == "JMP" ? ADDRMODE.ABINX : ADDRMODE.INX;
				coda=',X)';
			} else
			if(ctx.sym[ctx.ofs+3] == ")") {

				if(ctx.sym[ctx.ofs+4] == "Y") {
					mode= ADDRMODE.INY;
					coda='),Y';
				} else {
					coda= ')';
				}
			}

			ctx.ofs++;
			addr= ctx.sym[ctx.ofs+1];
			b1= 0;
			b2= addr.length;
			ctx.sym.length-= 2;
		}
		else if(mode>2) {
			switch(ctx.sym[ctx.ofs+2]) {
				case "X":
					mode+= 1;
					coda= ',X';
					ctx.ofs++;
					break;
				case "Y":
					mode+= 2;
					coda= ',Y';
					ctx.ofs++;
					break;
			}
		}

		instr= opctab[mode];
		if(instr<=-10) {
			// redirect to implicit fallback
			mode = -instr - 10;
			instr= opctab[mode];
		}
		if(instr<0) {
			ctx.pict+= addr.substr(b1);
			logError(ctx, ET_C,'invalid address mode for '+opc);
			return false;
		}

		// operand
		if((mode==12 || (opc=='JMP' && mode==3)) && addr && (addr.charAt(0)=='!' || addr.charAt(0)==':')) {
			// anonymous target

			let target= getAnonymousTarget(ctx, addr, anonymousTargets);
			if(target.error) {
				ctx.pict+= target.pict;
				logError(ctx, ctx.pass==1? ET_S:ET_C, target.error);
				return false;
			}
			if(ctx.pass==1) {
				ctx.pict+= target.pict;
			}
			else {
				oper= target.address;
				ctx.pict+= ''+hexPrefix+getHexWord(oper);
			}
		}
		else if(mode>1) {
			let expr= addr.substring(b1,b2),
				e0= expr.charAt(0),
				autoZpg = ctx.options.autoZpg && !ext && mode>=3 && mode<=5 && hasZpgMode(ctx, opc);

			if(expressionStartChars.indexOf(e0)<0) {
				ctx.pict+= e0;
				logError(ctx, ET_S,'illegal character');
				return false;
			}

			let r= getExpression(ctx, expr);
			if(r.error) {
				ctx.pict+= r.pict;
				if(r.undef) {
					logError(ctx, r.et||ET_C,`U2 undefined symbol in ${ctx.currentNS} : "${r.undef}"`);
					// let entries= [];
					// Object.keys(ctx.namespaces[ctx.currentNS]).forEach(name => entries.push(name));
					// console.log(entries.join(", "));
				}
				else {
					logError(ctx, r.et||ET_P,r.error);
				}
				return false;
			}

			oper= r.v;
			if(r.isWord)
				autoZpg= false;

			if(autoZpg && oper<0x100 && opctab[mode+3]>=0)
				mode+= 3;
			if(ctx.pass==1) {
				ctx.pict+= r.pict;
			}
			else if(mode==12) {
				ctx.pict+= hexPrefix+getHexWord(oper);
			}
			else {
				ctx.pict+= hexPrefix + (
					steptab[mode]>2 ?
						getHexWord(oper)
						:
						getHexByte(oper)
				);
			}
			ctx.pict+= coda;
		}

		if(ctx.sym.length>ctx.ofs+2) {
			ctx.pict+=' '+ctx.sym[ctx.ofs+2].charAt(0);
			logError(ctx, ET_S,'unexpected extra characters');
			return false;
		}

		if(ctx.pass==2) {
			instr= opctab[mode];
			if(mode==12) {
				// rel
				oper-= ((ctx.pc+2)&0xffff);
				if(oper>127 || oper<-128) {
					logError(ctx, ET_C,'branch target out of range');
					return false;
				}
			}
			// compile
			compile(ctx, ctx.pc, instr);
			ctx.asm= getHexByte(instr);
			if(mode>1) {
				let op= oper&0xff;
				compile(ctx, ctx.pc+1, op);
				ctx.asm+= ' '+getHexByte(op);
				if(steptab[mode]>2) {
					op=(oper>>8)&0xff;
					compile(ctx, ctx.pc+2, op);
					ctx.asm+= ' '+getHexByte(op);
				}
			}
		}
		logLine(ctx);
		ctx.pc+= steptab[mode];
	}
	return true;
}