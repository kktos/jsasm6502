import { getExpression } from "../expression.js";
import { ET_P, ET_S, logError, logLine } from "../log.js";
import { getHexByte, getHexWord, hexPrefix, pcSymbol, setSegmentOrigin } from "../utils.js";

export function processOrg(ctx, pragma) {
	// set pc
	ctx.pict= (pragma=='ORG' ? '.':'')+pragma;
	let assignmentRequired = (pragma=='*' || pragma=='P%');

	// ctx.ofs=1;

	if(ctx.sym.length>1 && (ctx.sym[1]=='=' || (ctx.sym[1]=='EQU'))) {
		ctx.pict+=' '+ctx.sym[1];
		ctx.ofs++;
	}
	else if(assignmentRequired) {
		if(ctx.sym.length>1)
			ctx.pict+=' '+ctx.sym[1].charAt(0);
		logError(ctx, ET_S, 'assignment expected');
		return false;
	}
	if(ctx.sym.length<=ctx.ofs) {
		logError(ctx, ET_S, 'expression expected');
		return false;
	}
	ctx.pict+= ' ';

	const r= getExpression(ctx, ctx.sym[ctx.ofs]);
	let fillbyte= -1;

	ctx.pict+= r.pict;

	if(r.undef) {
		logError(ctx, r.et||ET_P, 'undefined symbol "'+r.undef+'"');
		return false;
	}

	if(r.error) {
		logError(ctx, r.et||ET_P, r.error);
		return false;
	}

	if(ctx.sym.length > ctx.ofs+1) {
		let flbr= getExpression(ctx, ctx.sym[++ctx.ofs]);
		ctx.pict+= ' '+flbr.pict;
		if(flbr.error) {
			logError(flbr.et||ET_P, flbr.error);
			return false;
		}
		fillbyte= flbr.v&0xff;
	}

	if(ctx.sym.length > ctx.ofs+1) {
		ctx.pict+= ' '+ctx.sym[ctx.ofs+1].charAt(0);
		logError(ctx, ET_S, 'unexpected extra characters'); return false;
	}

	ctx.addrStr= getHexWord(r.v);

	if(ctx.pass==2) {
		if (r.error) {
			logError(ctx, r.et||'error', r.error);
			return false;
		}
		ctx.pict= pcSymbol+' = '+hexPrefix+ctx.addrStr;
		if(fillbyte>=0)
			ctx.pict+=' '+hexPrefix+getHexByte(fillbyte);
		ctx.asm= ctx.asmSpace;
		if(fillbyte>=0)
			fill(ctx, r.v, fillbyte);
	}

	ctx.pc= r.v;

	let err;
	if(err= setSegmentOrigin(ctx, ctx.pc)) {
		logError(ctx, ET_S, err);
		return false;
	}

	// if(ctx.pass==2)
	// 	console.log("--- ORG", ctx.pc.toString(16));

	logLine(ctx);
	return true;
}
