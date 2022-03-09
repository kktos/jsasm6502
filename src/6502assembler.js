import { getExpression, getIdentifier } from "./expression.js";
import { ET_C, ET_P, ET_S, logError, logLine } from "./log.js";
import { initNS, isNSentryDefined, NS_GLOBAL, setNSentry } from "./namespace.js";
import { parsePragma, processPragma } from "./pragma.js";
import { expandMacro } from "./pragmas/macro.pragma.js";
import { CPU_CONST, setcpu } from "./pragmas/setcpu.pragma.js";
import { encodeAscii } from "./pragmas/string.pragma.js";
import { ADDRMODE, steptab } from "./tables.js";
import { nextLine, tokenizeNextLine } from "./tokenizer.js";
import { commentChar, compile, getHexByte, getHexWord, hexPrefix, pcSymbol } from "./utils.js";

// 6502 assembler
// n. landsteiner, mass:werk, www.masswerk.at
// 2021: added compatibility for opcode extensions (".b", ".w"),
//       accepts now colons after labels, alt. prgama ".ORG" for origin;
//       support for illegal opcodes, support for expressions,
//       auto-zeropage addr. default, slightly modernized UI.
// statics

let codeStore,
	bbcMode=false, redefSyms=false,
	bbcBlock=false, isHead, anonymousTargets;

let ctx= {
	rawLine: null,
	srcl: null,
	srcc: null,
	codesrc: null,
	ofs: 0,
	readFile: null,
	filename: null,

	options: {
		autoZpg: true,
		useIllegals: false,
		listing: false
	},

	macros: null,

	code: {},
	codeStart: null,
	codeEnd: null,
	currentSegment: null,
	segments: null,
	currentNS: NS_GLOBAL,
	namespaces: { [NS_GLOBAL]: {} },

	pc: null,
	cbmStartAddr: 0,

	charEncoding: encodeAscii,
	convertPi: null,

	cpu: null,
	opcodes: null,

	pass: null,
	sym: null,
	pict: null,
	asm: null,
	addrStr: null,
	srcLnStr: null,
	srcLnNo: null,
	asmSpace: "           ",
	pass1Spc: "           ".substring(6),
	// pass1Spc: ctx.asmSpace.substring(6),
	anonMark: null,
	labelStr: null,
	listing: "",
	comment: "",
	pageHead: "",
	pageCnt: 1,

	repeatInterval: null,
	repeatSym: null,
	repeatLine: null,
	repeatCntr: null,
	repeatStep: null
};

// functions

export function assemble(mainFilename, opts) {
	return new Promise(resolve => {
		setTimeout(() => {
			// const res= startAssembly(mainFilename, opts);
			// resolve({code: ctx.code, segments: ctx.segments});
			resolve(startAssembly(mainFilename, opts));
		}, 0);
	});
}

function log(str) {
	console.log(str);
}

function startAssembly(mainFilename, opts) {
	ctx.currentNS= NS_GLOBAL;
	initNS(ctx);

	codeStore= null;

	ctx.options.autoZpg= true;
	ctx.options.listing= opts.listing===true ? true : false;

	// ctx.charEncoding= encodeAscii;
	ctx.comment= "";
	ctx.readFile= (filename) => { const src= opts.readFile(filename); return src ? splitSrc(src) : null; };

	ctx.codesrc= ctx.readFile(mainFilename);
	ctx.filename= mainFilename;
	if(opts.segments)
		ctx.segments= opts.segments;
	else {
		ctx.segments= { CODE: {start:0x1000, end:0xFFFF} };
		ctx.currentSegment= "CODE";
		ctx.code["CODE"]= [];
	}

	let empty= true;
	if(ctx.codesrc)
		for(let i=0; i<ctx.codesrc.length; i++) {
			if((/\S/).test(ctx.codesrc[i])) {
				empty= false;
				break;
			}
		}
	if(empty) {
		log('no source code.');
		return;
	}

	ctx.listing= "pass 1\n\nLINE  LOC          LABEL     PICT\n\n";

	let pass2= false,
		range;


	// ctx.code= [];
	// ctx.codeStart= 0x10000;
	// ctx.codeEnd= 0;
	// setSegmentOrigin(ctx, 0);
	ctx.cbmStartAddr= 0;

	ctx.pass= 1;
	ctx.macros= {};

	setcpu(ctx, "6502");

	setNSentry(ctx, "CPU_6502", { v: CPU_CONST["6502"], isWord: false, pc: 0, isPrivate: true });
	setNSentry(ctx, "CPU_65X02", { v: CPU_CONST["65X02"], isWord: false, pc: 0, isPrivate: true });
	setNSentry(ctx, "CPU_65C02", { v: CPU_CONST["65C02"], isWord: false, pc: 0, isPrivate: true });
	setNSentry(ctx, "%locals%", { v: null, isPrivate: true });

	let pass1= asmPass(ctx);

	if(pass1) {
		// ctx.listing+= '\nsymbols\n';
		// ctx.listing+= dumpSymbols().join("\n");
		ctx.listing+= 'pass 2\n\nLOC   CODE         LABEL     INSTRUCTION\n\n';
		ctx.pass= 2;

		pass2= asmPass(ctx);
		if(pass2) {
			if(ctx.codeStart==0x10000)
				ctx.codeStart= 0;
			range= getHexWord(ctx.codeStart)+'..'+getHexWord(ctx.codeEnd);

			const hasCode= Object.keys(ctx.code).some(k => ctx.code[k].length);
			if(hasCode)
				ctx.listing+='\ndone (code: '+range+').';
			else
				ctx.listing+='\ndone.\nno code generated.';
		}
	}

	if(ctx.options.listing)
		log(ctx.listing);

	if(pass1 && pass2) {

		const hasCode= Object.keys(ctx.code).some(k => ctx.code[k].length);

		if(hasCode) {
			log('6502 Assembler','Assembly complete ('+range+'), ok.');
			return {code: ctx.code, segments: ctx.segments};
		}
		else {
			log('6502 Assembler','No code generated.');
			return {error: true, message: "No code generated"};
		}
	}
	else {
		// listingElement.value+='\nfailed.\n';
		log('6502 Assembler','Assembly failed (see listing).');
		return {error: true, message: "Assembly failed"};
	}
}

export function dumpCode(ctx, segmentName, wannaShowAddr) {
	let s= "",
		fillbyte= 0;

	const code= ctx.code[segmentName];
	if(!code || !code.length)
		return null;

	const codeStart= ctx.segments[segmentName].start;
	const codeEnd= codeStart + code.length;
	let ofs= wannaShowAddr? codeStart%8 : 0;

	for(let addr= codeStart-ofs; addr<codeEnd; addr++) {
		if((addr%8==0) && wannaShowAddr)
			s+= getHexWord(addr)+': ';

		if(addr<codeStart)
			s+='.. ';
		else {
			s+= getHexByte(typeof code[addr-codeStart] == 'undefined' ? fillbyte : code[addr-codeStart] || 0);
			s+= (addr%8==7 || addr==codeEnd-1)? '\n':' ';
		}
	}

	// storeCode(ctx.codeStart,s, ctx.cbmStartAddr||ctx.codeStart);
	// console.log(codeStore);
	return s;
}

export function dumpSymbols() {
	const symbols= [];

	function dumpNSSymbols(NSsymbols) {
		let keys= [];
		Object
			.entries(NSsymbols)
			.filter(([k,v]) => !v.isPrivate)
			.forEach( ([k,v]) => keys.push(k));

		keys.sort().forEach( (key) => {
			const sym = NSsymbols[key];
			symbols.push(
							' '+
							key.padStart(15, " ")+
							" "+
							(sym.isWord ||sym.v>0xff? hexPrefix+getHexWord(sym.v):'  '+hexPrefix+getHexByte(sym.v))
			);

		});
		return symbols;
	}

	Object.entries(ctx.namespaces).forEach(([NSname, NSsymbols]) => {
		symbols.push("NS "+NSname);
		dumpNSSymbols(NSsymbols);
	})

	return symbols;
}

function splitSrc(value) {
	if( value.indexOf('\r\n')>=0) {
		return value.split('\r\n');
	}
	else if( value.indexOf('\r')>=0) {
		return value.split('\r');
	}
	else {
		return value.split('\n');
	}
}

function hasZpgMode(opc) {
	const instr=ctx.opcodes[opc];
	return instr && (instr[6]>=0 || instr[7]>=0 || instr[8]>=0);
}

function hasWordMode(opc) {
	const instr=ctx.opcodes[opc];
	return instr && (instr[3]>=0 || instr[4]>=0 || instr[5]>=0);
}

function asmPass(ctx) {
	let headComments=false,
		expressionStartChars = "$%@&'\"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_*-<>[].",
		// labelStartChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ_',
		operatorChars = "+-*/",
		lastDlrPpct=-1;

	ctx.pageCnt= 1;
	ctx.pageHead= '';

	if(ctx.pass==1)
		anonymousTargets= [];

	function getAnonymousTarget(targetSym) {
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

	ctx.pc= ctx.currentSegment ? ctx.segments[ctx.currentSegment].start : 0;

	bbcBlock= ctx.convertPi= false;
	ctx.srcLineIdx= ctx.srcc= ctx.srcLineNumber= 0;
	isHead= true;
	ctx.sym= tokenizeNextLine(ctx);
	ctx.labelStr= '         ';
	ctx.anonMark= '';
	ctx.repeatCntr= ctx.repeatStep= ctx.repeatInterval= 0;
	ctx.ifLevel= 0;
	ctx.ifs= [undefined];

	while (ctx.sym) {

		// if(ctx.ifLevel)
		// 	ctx.listing+= "ifLevel " + ctx.ifLevel + '\n';

		ctx.addrStr= ctx.pict= ctx.asm= '';
		if(ctx.sym.length==0) {
			if(ctx.comment) {
				if(isHead) {
					if(ctx.pass==1) {
						ctx.srcLnStr= ''+ctx.srcLineNumber;
						while (ctx.srcLnStr.length<4)
							ctx.srcLnStr= ' '+ctx.srcLnStr;
						ctx.listing+= ctx.srcLnStr+'               '+ctx.comment+'\n';
					}
					else {
						ctx.listing+= '                   '+ctx.comment+'\n';
					}
					if(!ctx.pageHead)
						ctx.pageHead= ctx.comment;
					headComments= true;
				}
				else logLine(ctx);
				ctx.comment='';
			}
			nextLine(ctx);
			continue;
		}

		if(isHead) {
			if(headComments)
				ctx.listing+= '\n';
			isHead= false;
		}

		// console.log("\nLOOP", ctx.pass, ctx.pc.toString(16));

		ctx.pc&= 0xffff;
		ctx.ofs= 0;

		let c0= ctx.sym[0].charAt(0);

		// console.log("--- inc16", {lines: ctx.macros["INC16"]?.lines});
		// console.log( ctx.macros["INC16"]?.lines.reduce((acc, cur)=> acc+= cur.raw+"\n" , ""));

		// temporary labels
		if(c0=='!' || c0==':') {
			ctx.addrStr= getHexWord(ctx.pc);

			if(ctx.sym[ctx.ofs].length>1) {
				ctx.labelStr=(ctx.pass==1? c0:'!')+ctx.sym[ctx.ofs].charAt(1);
				logError(ctx, ET_S,'illegal character adjacent to anonymous label');
				return false;
			}

			ctx.anonMark= (ctx.pass==1 ? c0 : '!');

			if(ctx.pass==1)
				anonymousTargets.push(ctx.pc);

			// ctx.ofs++;
			ctx.sym.shift();

			if(ctx.sym.length>ctx.ofs) {
				c0= ctx.sym[ctx.ofs].charAt(0);
			}
			else {
				logLine(ctx);
				nextLine(ctx);
				continue;
			}
		}

		const pragma= parsePragma(ctx.sym[ctx.ofs]);
		if(pragma) {
			const step= processPragma(ctx, pragma);
			if(step === null)
				continue;
			return step;
		}

		const labelPrefix='';
		const identRaw = ctx.sym[ctx.ofs];
		const [identCooked] = identRaw.split(".");
		const isIdentifier= identCooked != "" && ctx.opcodes[identCooked]==null;

		if(isIdentifier) {
			// identifier
			let r= getIdentifier(identRaw, 0, true),
				ident= r.v;

			// console.log("identifier", {r});

			if(ctx.pass==1) {

				if(r.idx!=identRaw.length) {
					let parsed= identRaw.substring(0,r.idx),
						illegalChar= identRaw.charAt(r.idx),
						message= 'Illegal character "'+illegalChar+'"';
					ctx.pict+= labelPrefix+parsed+illegalChar;
					if(parsed=='P' && illegalChar=='%')
						message+= '\n\nmeant assignment to P%?';
					logError(ctx, ET_P,message);
					return false;
				}

				if(ident=='' || identCooked!=identRaw) {
					ctx.pict= ctx.sym[0];
					logError(ctx, ET_S,'invalid identifier');
					return false;
				}

				if(isNSentryDefined(ctx, ident, "main") && !redefSyms) {
					ctx.pict+=ctx.sym[0];
					if(ctx.sym[1]=='=') {
						ctx.pict+= ' =';
						logError(ctx, ET_P,'symbol already defined');
					}
					else {
						logError(ctx, ET_P,'label already defined');
					}
					return false;
				}
			}

			ctx.ofs++;
			if(ctx.sym.length>1 && (ctx.sym[ctx.ofs]=='=' || (ctx.sym[ctx.ofs]=='EQU'))) {
				ctx.pict= ident+' '+ctx.sym[ctx.ofs]+' ';
				ctx.ofs++;
				if(ctx.sym.length<=ctx.ofs) {
					logError(ctx, ET_S, 'unexpected end of line, expression expected');
					return false;
				}

				const arg= ctx.sym[ctx.ofs];
					// a1= arg.charAt(0);

				if(arg=='*') {
					ctx.pict+= ctx.pass==1 ? arg : pcSymbol;
					r={ v: ctx.pc, isWord: false, pc: ctx.pc };
				}
				else {

					r= getExpression(ctx, arg);
					ctx.pict+= r.pict;
					if(r.error) {
						logError(ctx, r.et||ET_P, r.error);
						return false;
					}
					if(r.undef) {
						logError(ctx, r.et||ET_C, 'undefined symbol "'+r.undef+'"');
						return false;
					}
				}

				ctx.ofs++;

				if(ctx.sym.length>ctx.ofs) {
					if(ctx.sym.length==ctx.ofs+1 && ctx.sym[ctx.ofs]=='W') { // ignore 'W' suffix
						ctx.pict+= ' '+commentChar+'w';
					}
					else {
						ctx.pict+= ' '+ctx.sym[ctx.ofs].charAt(0);
						logError(ctx, ET_S,'unexpected extra characters');
						return false;
					}
				}

				if(ctx.pass==1) {
					setNSentry(ctx, ident, r);
				}
				else {
					ctx.asm= ident+' = ' + hexPrefix + ((r.isWord || r.v>0xff) ? getHexWord(r.v) : getHexByte(r.v));
					ctx.pict= ctx.asm;
					ctx.asm= ctx.asmSpace;
				}

				if(ident=='A' && ctx.pass==1)
					logError(ctx, 'warning', 'symbol "A" may be ambiguous in address context.', true);
				else
					logLine(ctx);

				nextLine(ctx);
				continue;
			}
			else {
				if(ident.length && ident.indexOf('%')==ident.length-1) {
					logError(ctx, ET_S,'assignment expected');
					return false;
				}

// console.log("ident", ident, ctx.macros);

				if(ctx.macros[ident]) {
					if(expandMacro(ctx, ident))
						continue;
					else
						return false;
				}

				ctx.addrStr= getHexWord(ctx.pc);
				ctx.labelStr= labelPrefix+ident+' ';

				if(ctx.pass==1) {
					setNSentry(ctx, ident, { v: ctx.pc, isWord: false, pc: ctx.pc });
				}

				if(ctx.sym.length>=ctx.ofs+1) {
					c0= ctx.sym[ctx.ofs].charAt(0);
				}
				else {
					logLine(ctx);
					nextLine(ctx);
					continue;
				}
			}
		}

		if(ctx.sym.length < ctx.ofs) {
			// end of line
			logLine(ctx);
			nextLine(ctx);
			continue;
		}

		if(ctx.ofs==0)
			ctx.addrStr= getHexWord(ctx.pc);

		// console.log(ctx.rawLine, ctx.sym);
		const pragma2= parsePragma(ctx.sym[ctx.ofs]);
		if(pragma2) {
			const step= processPragma(ctx, pragma2);
			if(step === null)
				continue;
			return step;
		}

		if(c0<'A' || c0>'Z') {
			ctx.pict+= c0;
			// if(ctx.ofs>0 && c0=='.')
			// 	logError(ctx, ET_S,'character expected\n(no labels allowed on same line as pragmas)');
			// else
			if(ctx.ofs>0)
				logError(ctx, ET_S,'character or assignment operator expected');
			else
				logError(ctx, ET_S,'character expected');

			return false;
		}
		else {
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
				if( (rsym=='B' && hasZpgMode(opc)) || (rsym=='W' && hasWordMode(opc)) ) {
					ext= rsym.toLowerCase();
					ctx.pict+= (ctx.pass==1) ? opc+'.'+ext : opc;
				}
				else {
					ctx.pict+= opc;
					if(rsym=='B' || rsym=='W') {
						logError(ctx, ET_C,'invalid extension '+rsym+' for opcode '+opc);
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
				var addrmode = (opctab[0]<0 && opctab[1]>=0)? 1:0;
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

					let target= getAnonymousTarget(addr);
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
						autoZpg = ctx.options.autoZpg && !ext && mode>=3 && mode<=5 && hasZpgMode(opc);

					if(expressionStartChars.indexOf(e0)<0) {
						ctx.pict+= e0;
						logError(ctx, ET_S,'illegal character');
						return false;
					}

					let r= getExpression(ctx, expr);
					if(r.error) {
						ctx.pict+=r.pict;
						if(r.undef) {
							logError(ctx, r.et||ET_C,'undefined symbol "'+r.undef+'"');
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
		}
		nextLine(ctx);
	}

	return true;
}

function storeCode(addr, code, startAddr) {
	if(code) {
		var id=new Date().getTime().toString(36);
		codeStore = {
			'id': id,
			'addr': addr,
			'code': code,
			'startAddr': startAddr
		};
	}
	else {
		codeStore=null;
	}
}
