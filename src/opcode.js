import { getExpression } from "./expression.js";
import { ET_C, ET_P, ET_S, logError, logLine } from "./log.js";
import { ADDRMODE, steptab } from "./tables.js";
import { compile, getHexByte, getHexWord, hexPrefix } from "./utils.js";

// const expressionStartChars = "$%@&'\"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_*-<>[].";
const operatorChars = "+-*/";

function hasZpgMode(ctx, opc) {
	const instr= ctx.opcodes[opc];
	return instr && (instr[6]>=0 || instr[7]>=0 || instr[8]>=0);
}

function hasWordMode(ctx, opc) {
	const instr= ctx.opcodes[opc];
	return instr && (instr[3]>=0 || instr[4]>=0 || instr[5]>=0);
}

function getAnonymousTarget(ctx, anonymousTargets) {
	let offset=0;
	let pict= ctx.pass==1 ? ctx.sym[ctx.ofs] : ':';

	ctx.ofs++;

	for(let idx= ctx.ofs; idx<ctx.sym.length; idx++) {
		pict+= ctx.sym[ctx.ofs];
		
		switch(ctx.sym[ctx.ofs]) {
			case "+":
				if(offset<0)
					return { 'pict': pict, 'error': 'illegal sign reversal in offset operand' };
				offset++;
				break;

			case "-":
				if(offset>0)
					return { 'pict': pict, 'error': 'illegal sign reversal in offset operand' };
				offset--;
				break;

			default:
				return { 'pict': pict, 'error': 'unexpected character in offset operand' };
		}

		// if(ctx.sym[ctx.ofs]=='+') {
		// 	if(offset<0)
		// 		return { 'pict': pict, 'error': 'illegal sign reversal in offset operand' };
		// 	offset++;
		// }
		// else if(ctx.sym[ctx.ofs]=='-') {
		// 	if(offset>0)
		// 		return { 'pict': pict, 'error': 'illegal sign reversal in offset operand' };
		// 	offset--;
		// }
		// else {
		// 	return { 'pict': pict, 'error': 'unexpected character in offset operand' };
		// }
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
	idx+= offset;
	if(idx<0 || idx>=anonymousTargets.length) {
		return { 'pict': pict, 'error': 'anonymous offset out of range (no such anonymous label)' };
	}
	return { 'pict': pict, 'error': false, 'address': anonymousTargets[idx] };
}

export function parseOpcode(ctx, anonymousTargets) {

	// opcode
	let opctab,
		instr,
		addr,
		mode= 0,
		oper= 0;

	let [opc, ext]= ctx.sym[ctx.ofs].split(".");

	ctx.pict+= opc;
	
	if(ext) {
		ext= ext.toLowerCase();
		if( (ext=='b' && hasZpgMode(ctx, opc)) || (ext=='w' && hasWordMode(ctx, opc)) ) {
			if(ctx.pass==1)
				ctx.pict+= '.'+ext;
		} else {
			ctx.pict+= "."+ext;
			logError(ctx, ET_S, 'invalid extension format: '+ext+" only valid are .b .w");
			return false;
		}
	}

	console.log("parseOpcode", {opc});

	opctab= ctx.opcodes[opc];

	if(opctab==null) {
		logError(ctx, ET_S, ctx.ofs==0? 'opcode or label expected':'opcode expected');
		return false;
	}

	ctx.ofs++;
	addr= ctx.sym[ctx.ofs];

	console.log("parseOpcode", {addr, sym:ctx.sym.slice(ctx.ofs+1)});

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
		return true;
	}

	let r;

	switch(addr) {
		case ":":
			r= {pict:' :'};
			mode= (opctab[ADDRMODE.REL]<0) ? 3 : 12;
			break;

		case "#":
			ctx.pict+=' #';
			mode= 2;
			ctx.ofs++;
			break;

		case "(":
			ctx.pict+= ' (';
			mode= ADDRMODE.IND;
			ctx.ofs++;
			break;
		
		default:
			ctx.pict+= ' ';
			mode= (opctab[ADDRMODE.REL]<0) ? 3 : 12;
	}
	
	if(!r) {
		r= getExpression(ctx, "", false, mode==ADDRMODE.IND);
		if(r.error) {
			ctx.pict+= r.pict;
			if(r.undef) {
				logError(ctx, r.et||ET_C,`U2 undefined symbol in ${ctx.currentNS} : "${r.undef}"`);
			}
			else {
				logError(ctx, r.et||ET_P,r.error);
			}
			return false;
		}
		if(ctx.pass==1)
			ctx.pict+= r.pict;
	}

	// if(addr=='A' && opctab[1]>=0) {
	// 	ctx.pict+= ' A';
	// 	b1= 1;
	// 	mode= 1;
	// }

	if(ext) {
		if(ext=='b' && (mode==3 || mode==6)) {
			mode=6;
		}
		else if(mode!=3) {
			logError(ctx, ET_P,'extension conflicts with operand type');
			return false;
		}
	}

	// console.log("OPCODE", {mode, r, sym:ctx.sym.slice(ctx.ofs)});
	
	let coda= '';

	if(mode== ADDRMODE.IND) {

		// lda ($10,x)
		// jmp ($1000,x)
		//   [1]= "(" [2]= address [3]= "X" [4]= ")"

		// lda ($10),y
		//   [1]= "(" [2]= address [3]= ")" [4]= "Y"

		// jmp ($1000)
		//   [1]= "(" [2]= address [3]= ")"

		if(ctx.sym[ctx.ofs+1] == ")") {

			if(ctx.sym[ctx.ofs] != "X") {
				logError(ctx, ET_S,'invalid address format');
				return false;
			}
			mode= opc == "JMP" ? ADDRMODE.ABINX : ADDRMODE.INX;
			coda= ',X)';
		}
		else
		if(ctx.sym[ctx.ofs] == ")") {
			if(ctx.sym[ctx.ofs+1] == "," && ctx.sym[ctx.ofs+2] == "Y") {
				mode= ADDRMODE.INY;
				coda='),Y';
				ctx.ofs+= 3;
			} else {
				coda= ')';
				ctx.ofs+= 1;
			}
		}
	}
	else if(mode>2) {
		if(ctx.sym[ctx.ofs-1] == ",") {
			switch(ctx.sym[ctx.ofs]) {
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
	}

	console.log("OPCODE", {mode, coda, sym:ctx.sym.slice(ctx.ofs)});

	// operand
	// if((mode==12 || (opc=='JMP' && mode==3)) && addr && (addr?.charAt(0)=='!' || addr?.charAt(0)==':')) {
	if((mode==12 || (opc=='JMP' && mode==3)) && (addr=='!' || addr==':')) {
		// anonymous target
		let target= getAnonymousTarget(ctx, anonymousTargets);
		if(target.error) {
			ctx.pict+= target.pict;
			logError(ctx, ctx.pass==1? ET_S:ET_C, target.error);
			return false;
		}
		if(ctx.pass==1) {
			ctx.pict+= " " + target.pict;
		}
		else {
			oper= target.address;
			ctx.pict+= " " + hexPrefix + getHexWord(oper);
		}
	}
	else if(mode>1) {
		let autoZpg = ctx.options.autoZpg && !ext && mode>=3 && mode<=5 && hasZpgMode(ctx, opc);

		if(ctx.pass==2 && mode==2 && r.v > 0xFF) {
			logError(ctx, ET_P, "Immediate value must be 8bits wide");
			return false;
		}

		oper= r.v;
		if(r.isWord)
			autoZpg= false;
		if(autoZpg && oper<0x100 && opctab[mode+3]>=0)
			mode+= 3;

		if(ctx.pass==2) {
			if(mode==12) {
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
		}
		ctx.pict+= coda;
	}

	if(ctx.sym.length>ctx.ofs+2) {
		ctx.pict+=' '+ctx.sym[ctx.ofs+2].charAt(0);
		logError(ctx, ET_S,'unexpected extra characters');
		return false;
	}

	instr= opctab[mode];
	if(instr<=-10) {
		// redirect to implicit fallback
		mode = -instr - 10;
		instr= opctab[mode];
	}
	if(instr<0) {
		// ctx.pict+= addr.substr(b1);
		logError(ctx, ET_C,'invalid address mode for '+opc);
		return false;
	}

	if(ctx.pass==2) {
		instr= opctab[mode];
		if(mode==12) {
			// rel
			oper-= ((ctx.pc+2) & 0xffff);
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
				op= (oper>>8) & 0xff;
				compile(ctx, ctx.pc+2, op);
				ctx.asm+= ' '+getHexByte(op);
			}
		}
	}
	logLine(ctx);
	ctx.pc+= steptab[mode];

	return true;
}