import { getExpression, getIdentifier } from "./expression.js";
import { ET_C, ET_P, ET_S, logError, logLine, logMsg } from "./log.js";
import { getNSentryInfo, initNS, isNSentryDefined, NS_GLOBAL, setNSentry } from "./namespace.js";
import { parseOpcode } from "./opcode.js";
import { parsePragma, processPragma } from "./pragma.js";
import { expandMacro } from "./pragmas/macro.pragma.js";
import { CPU_CONST, setcpu } from "./pragmas/setcpu.pragma.js";
import { encodeAscii } from "./pragmas/string.pragma.js";
import { nextLine, tokenizeNextLine } from "./tokenizer.js";
import { COMMENT_CHAR, getHexByte, getHexWord, hexPrefix, pcSymbol } from "./utils.js";

// 6502 assembler
// n. landsteiner, mass:werk, www.masswerk.at
// 2021: added compatibility for opcode extensions (".b", ".w"),
//       accepts now colons after labels, alt. prgama ".ORG" for origin;
//       support for illegal opcodes, support for expressions,
//       auto-zeropage addr. default, slightly modernized UI.
// statics

let codeStore, isHead, anonymousTargets;

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
	redefSyms: false,

	pc: null,
	cbmStartAddr: 0,

	charEncoding: encodeAscii,
	convertPi: null,

	cpu: null,
	opcodes: null,

	wannaOutput: true,
	pass: null,
	sym: null,
	pict: null,
	asm: null,
	addrStr: null,
	srcLnStr: null,
	srcLnNo: null,
	asmSpace: "           ",
	pass1Spc: "           ".substring(6),
	anonMark: null,
	labelStr: null,
	listing: "",
	comment: "",
	pageHead: "",
	pageCnt: 1,
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

function print(str) {
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
	ctx.readFile= (filename, fromFile) => { 
		const {path, content}= opts.readFile(filename, fromFile);
		return { path, content: splitSrc(content) };
	};
	ctx.YAMLparse= opts.YAMLparse;
	
	const mainFile = ctx.readFile(mainFilename);
	ctx.filename= mainFile.path;
	ctx.codesrc= mainFile.content;

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
		print('no source code.');
		return;
	}

	ctx.listing= "";
	logMsg(ctx, "\nPASS 1\nLINE  LOC          LABEL     PICT\n\n", true);

	let pass2= false;

	ctx.cbmStartAddr= 0;
	ctx.pass= 1;
	ctx.macros= {};

	setcpu(ctx, "6502");

	setNSentry(ctx, "CPU_6502", { v: CPU_CONST["6502"], isWord: false, pc: 0, isPrivate: true });
	setNSentry(ctx, "CPU_65X02", { v: CPU_CONST["65X02"], isWord: false, pc: 0, isPrivate: true });
	setNSentry(ctx, "CPU_65C02", { v: CPU_CONST["65C02"], isWord: false, pc: 0, isPrivate: true });

	let pass1= asmPass(ctx);
	if(pass1) {
		logMsg(ctx, '\nPASS 2\nLOC   CODE         LABEL     INSTRUCTION\n\n', true);
		ctx.pass= 2;
		pass2= asmPass(ctx);
	}

	if(ctx.options.listing)
		print(ctx.listing);

	if(pass1 && pass2) {

		const hasCode= Object.keys(ctx.code).some(k => ctx.code[k].length);

		if(hasCode) {
			print('6502 Assembler - Assembly complete.');
			return {code: ctx.code, segments: ctx.segments};
		}
		else {
			print('6502 Assembler - No code generated.');
			return {error: true, message: "No code generated"};
		}
	}
	else {
		print('6502 Assembler - Assembly failed (see listing).');
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
	if(!value)
		return value;
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

function asmPass(ctx) {
	let headComments= false;

	ctx.pageCnt= 1;
	ctx.pageHead= '';

	if(ctx.pass==1)
		anonymousTargets= [];

	ctx.pc= ctx.currentSegment ? ctx.segments[ctx.currentSegment].start : 0;

	ctx.convertPi= false;
	ctx.srcLineIdx= ctx.srcc= ctx.srcLineNumber= 0;
	isHead= true;
	ctx.sym= tokenizeNextLine(ctx);
	ctx.labelStr= '         ';
	ctx.anonMark= '';
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
							logMsg(ctx, ctx.srcLnStr+'               '+ctx.comment+'\n');
					}
					else {
						logMsg(ctx, '                   '+ctx.comment+'\n');
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
				logMsg(ctx, '\n');
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
				ctx.labelStr= (ctx.pass==1? c0:'!')+ctx.sym[ctx.ofs].charAt(1);
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

		// const pragma= parsePragma(ctx.sym[ctx.ofs]);
		// if(pragma) {
		// 	const step= processPragma(ctx, pragma);
		// 	if(step === null)
		// 		continue;
		// 	return step;
		// }

		if(ctx.lineHasLabel) {
			const labelPrefix= '';
			const identRaw = ctx.sym[ctx.ofs];
			const [identCooked] = identRaw.split(".");
			const isIdentifier= identCooked != "" && ctx.opcodes[identCooked]==null;

			if(isIdentifier) {
				// identifier
				let r= getIdentifier(identRaw, 0, true),
					ident= r.v;

				if(ctx.pass==1) {

console.log("IDENTIFER", {identRaw, r});

					if(r.idx!=identRaw.length) {
						let parsed= identRaw.substring(0,r.idx),
							illegalChar= identRaw.charAt(r.idx),
							message= 'Illegal character "'+illegalChar+'"';
						ctx.pict+= labelPrefix+parsed+illegalChar;
						// if(parsed=='P' && illegalChar=='%')
						// 	message+= '\n\nmeant assignment to P%?';
						logError(ctx, ET_P,message);
						return false;
					}

					if(ident=='' || identCooked!=identRaw) {
						ctx.pict= ctx.sym[0];
						logError(ctx, ET_S,'invalid identifier');
						return false;
					}

					if(isNSentryDefined(ctx, ident) && !ctx.redefSyms) {
						const info= getNSentryInfo(ctx, ident);
						ctx.pict+= ctx.sym[0];
						if(ctx.sym[1]=='=') {
							ctx.pict+= ' =';
							logError(ctx, ET_P, `symbol already defined in ${info.src} line ${info.line}`);
						}
						else {
							logError(ctx, ET_P, `label already defined in ${info.src} line ${info.line}`);
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
							logError(ctx, r.et||ET_C, 'U1 undefined symbol "'+r.undef+'"');
							return false;
						}
					}

					ctx.ofs++;

					if(ctx.sym.length>ctx.ofs) {
						if(ctx.sym.length==ctx.ofs+1 && ctx.sym[ctx.ofs]=='W') { // ignore 'W' suffix
							ctx.pict+= ' '+COMMENT_CHAR+'w';
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
		
		if(ctx.macros[ctx.sym[ctx.ofs]]) {
			if(expandMacro(ctx, ctx.sym[ctx.ofs++]))
				continue;
			else
				return false;
		}

		if(!parseOpcode(ctx, anonymousTargets))
			return false;
			
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
