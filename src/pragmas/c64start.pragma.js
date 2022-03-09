import { ET_C, ET_P, ET_S, logError, logLine } from "../log.js";
import { compile, getHexByte, getHexWord } from "../utils.js";
import { encodePetscii } from "./string.pragma.js";

export function c64Start(ctx, pragma) {

	if (ctx.code.length) {
		logError(ctx, ET_C, '".'+pragma+'" must be the first instruction.');
		return false;
	}

	let basicLineNo= '',
		remText= '',
		// lineLengthMax=88,
		lineNumberMax= '63999',
		basicAddr= pragma=='PETSTART'? 0x0401:0x0801,
		rem= [],
		linkAddr;

	ctx.pc= basicAddr;
	ctx.addrStr= getHexWord(ctx.pc);
	ctx.pict= '.'+pragma;
	if (ctx.sym[ctx.ofs] && (/^[0-9]+$/).test(ctx.sym[ctx.ofs])) {
		basicLineNo= ctx.sym[ctx.ofs];
		ctx.ofs++;
		ctx.pict+= ' '+basicLineNo;
	}
	if (ctx.sym[ctx.ofs] && ctx.sym[ctx.ofs].charAt(0)!='"') {
		ctx.pict+=' '+ctx.sym[ctx.ofs].charAt(0);
		logError(ctx, ET_S, basicLineNo? 'string expected':'line number or string expected');
		return false;
	}
	while (ctx.sym[ctx.ofs]) {
		remText+=ctx.sym[ctx.ofs++].replace(/^"/,'').replace(/"\s*,?$/,'').replace(/","/g, '\\n');
		if (ctx.sym[ctx.ofs]==',') ctx.ofs++;
		if (ctx.sym[ctx.ofs]) {
			ctx.sym[ctx.ofs]=ctx.sym[ctx.ofs].replace(/^,\s*/,'');
			if (ctx.sym[ctx.ofs].charAt(0)!='"') {
				ctx.pict+=' "'+remText.replace(/\\n/g, '", "')+'", '+ctx.sym[ctx.ofs].charAt(0);
				logError(ctx, ET_S,'string expected');
				return false;
			}
			remText+='\\n';
		}
	}

	if (!basicLineNo || basicLineNo>lineNumberMax)
		basicLineNo=''+(new Date()).getFullYear();

	if (remText) {
		ctx.pict+=' "';
		var cnt=0, t=[];
		for (var i=0; i<remText.length; i++) {
			var c=remText.charAt(i), cc=remText.charCodeAt(i);
			ctx.pict+=c;
			if (cc==0x03C0) cc=0xff; //pi
			if (cc>0xff) {
				logError(ctx, ET_P, 'illegal character');
				return false;
			}
			if (c=='\\' && remText.charAt(i+1)=='n') {
				ctx.pict+='n';
				i++;
				cnt=0;
				rem.push(t);
				t=[];
				continue;
			}
			if (++cnt>80) {
				logError(ctx, ET_C, 'REM line too long (80 characters max.)');
				return false;
			}
			t.push(encodePetscii(cc));
		}
		if (t.length) rem.push(t);
		ctx.pict+='"';
		if (parseInt(basicLineNo,10)<rem.length) basicLineNo=''+rem.length;
	}
	logLine(ctx);
	if (ctx.pass==2) ctx.listing+='>>>>  COMPILING BASIC PREAMBLE...\n';
	if (rem.length) {
		for (var ln=0; ln<rem.length; ln++) {
			var remLine=rem[ln];
			linkAddr= ctx.pc+7+remLine.length;
			if (ctx.pass==2) {
				var linkLo=linkAddr&0xff,
					linkHi=linkAddr>>8
					lnLo=ln&0xff,
					lnHi=ln>>8,
				ctx.addrStr=getHexWord(ctx.pc);
				compile(ctx, ctx.pc++, linkLo);
				compile(ctx, ctx.pc++, linkHi);
				ctx.asm=getHexByte(linkLo)+' '+getHexByte(linkHi);
				ctx.pict='$'+getHexWord(linkAddr)+' ;LINE LINK';
				logLine(ctx);
				ctx.addrStr=getHexWord(ctx.pc);
				compile(ctx, ctx.pc++, lnLo);
				compile(ctx, ctx.pc++, lnHi);
				ctx.asm=getHexByte(lnLo)+' '+getHexByte(lnHi);
				ctx.pict='$'+getHexWord(ln)+' ;LINE NO. ("'+ln+'")';
				logLine(ctx);
				ctx.addrStr=getHexWord(ctx.pc);
				compile(ctx, ctx.pc++, 0x8f);
				compile(ctx, ctx.pc++, 0x20);
				ctx.asm='8F 20';
				ctx.pict=';"REM "';
				logLine(ctx);
				ctx.addrStr=getHexWord(ctx.pc);
				ctx.asm='';
				ctx.pict=';';
				for (var i=0; i<remLine.length; i++) {
					compile(ctx, ctx.pc++, remLine[i]);
					ctx.asm+=(ctx.asm? ' ':'')+getHexByte(remLine[i]);
					ctx.pict+='.'
					if ((i+1)%3==0) {
						logLine(ctx);
						ctx.addrStr=getHexWord(ctx.pc);
						ctx.asm='';
						ctx.pict=';';
					}
				}
				if (ctx.asm) logLine(ctx);
				ctx.addrStr=getHexWord(ctx.pc);
				compile(ctx, ctx.pc++, 0);
				ctx.asm='00';
				ctx.pict='$00   ;EOL';
				logLine(ctx);
			}
			ctx.pc= linkAddr;
		}
	}
	ctx.addrStr=getHexWord(ctx.pc);
	linkAddr= ctx.pc+11;
	ctx.cbmStartAddr= linkAddr+2;
	if (ctx.pass==2) {
		var linkLo=linkAddr&0xff,
			linkHi=linkAddr>>8,
			ln=parseInt(basicLineNo,10),
			lnLo=ln&0xff,
			lnHi=ln>>8,
			saStr=''+ctx.cbmStartAddr;
		ctx.addrStr=getHexWord(ctx.pc);
		compile(ctx, ctx.pc++, linkLo);
		compile(ctx, ctx.pc++, linkHi);
		ctx.asm=getHexByte(linkLo)+' '+getHexByte(linkHi);
		ctx.pict='$'+getHexWord(linkAddr)+' ;LINE LINK';
		logLine(ctx);
		ctx.addrStr=getHexWord(ctx.pc);
		compile(ctx, ctx.pc++, lnLo);
		compile(ctx, ctx.pc++, lnHi);
		ctx.asm=getHexByte(lnLo)+' '+getHexByte(lnHi);
		ctx.pict='$'+getHexWord(ln)+' ;LINE NO. ("'+basicLineNo+'")';
		logLine(ctx);
		ctx.addrStr=getHexWord(ctx.pc);
		compile(ctx, ctx.pc++, 0x9e);
		compile(ctx, ctx.pc++, 0x20);
		ctx.asm='9E 20';
		ctx.pict=';"SYS "';
		logLine(ctx);
		ctx.addrStr=getHexWord(ctx.pc);
		ctx.asm='';
		ctx.pict=';TEXT "';
		for (var i=0, max=saStr.length-1; i<=max; i++) {
			var c=saStr.charAt(i), cc=saStr.charCodeAt(i);
			compile(ctx, ctx.pc++, cc);
			ctx.asm+=(ctx.asm? ' ':'')+getHexByte(cc);
			ctx.pict+=c;
			if ((i+1)%3==0) {
				if (i==max) ctx.pict+='"';
				logLine(ctx);
				ctx.addrStr=getHexWord(ctx.pc);
				ctx.asm='';
				ctx.pict=';TEXT "';
			}
		}
		if (ctx.asm) {
			ctx.pict+='"';
			logLine(ctx);
		}
		ctx.addrStr=getHexWord(ctx.pc);
		compile(ctx, ctx.pc++, 0);
		ctx.asm='00';
		ctx.pict='$00   ;EOL';
		logLine(ctx);
		ctx.addrStr=getHexWord(ctx.pc);
		compile(ctx, ctx.pc++, 0);
		compile(ctx, ctx.pc++, 0);
		ctx.asm='00 00';
		ctx.pict='$0000 ;END OF BASIC TEXT (EMPTY LINK)';
		logLine(ctx);
	}
	ctx.pc= ctx.cbmStartAddr;
	if (ctx.pass==2)
		ctx.listing+='>>>>  START OF ASSEMBLY AT $'+getHexWord(ctx.pc)+' ("SYS '+ctx.cbmStartAddr+'")\n';

	return true;
}
