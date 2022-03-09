import { getExpression } from "../expression.js";
import { ET_P, ET_S, logError, logLine } from "../log.js";
import { getHexByte, getHexWord, hexPrefix } from "../utils.js";

function fill(ctx, len, b) {
	const filled= Array.from({length: len}, () => b);
	ctx.code[ctx.currentSegment]= ctx.code[ctx.currentSegment].concat(filled);
}

export function processAlign(ctx, pragma) {
	let pcOffset= 2,
		fillbyte= 0,
		delta;

	let expr;
	ctx.pict+= "."+pragma;
	if(ctx.sym.length > ctx.ofs) {
		ctx.pict+= ' ';

		expr= getExpression(ctx, ctx.sym[ctx.ofs++]);
		if (expr.error) {
			ctx.pict+= expr.pict;
			logError(ctx, expr.et||ET_P, expr.error);
			return false;
		}

		pcOffset= expr.v & 0xffff;
		ctx.pict+= ctx.pass==1 ?
					expr.pict
					:
					hexPrefix+(expr.v<0x100 ? getHexByte(pcOffset) : getHexWord(pcOffset));

		if(ctx.sym.length > ctx.ofs) { // fill-byte
			ctx.pict+=' ';

			expr= getExpression(ctx, ctx.sym[ctx.ofs++]);
			if (expr.error) {
				ctx.pict+= expr.pict;
				logError(ctx, expr.et||ET_P, expr.error);
				return false;
			}
			fillbyte= expr.v & 0xff;
			ctx.pict+= ctx.pass==1 ? expr.pict : hexPrefix+getHexByte(fillbyte);
		}
	}
	else if (pragma=='FILL') {
		logError(ctx, ET_S,'expression expected');
		return false;
	}
	if (ctx.sym.length > ctx.ofs+1) {
		ctx.pict+= ' '+ctx.sym[ctx.ofs+1].charAt(0);
		logError(ctx, ET_S, 'unexpected extra characters');
		return false;
	}
	else if (pragma=='FILL') {
		if (pcOffset<0) {
			logError(ctx, ET_C, 'negative offset value');
			return false;
		}
		delta= pcOffset;
	}
	else {

		delta= pcOffset - (ctx.pc % pcOffset);

	}

	// console.log("--- align", {
	// 	pc:ctx.pc.toString(16),
	// 	ofs: pcOffset.toString(16),
	// 	delta: delta.toString(16),
	// 	end: (ctx.pc+delta).toString(16)
	// });

	if(delta) {
		if(!ctx.currentSegment) {
			logError(ctx, ET_S, "no segment defined");
			return false;
		}
		const segment= ctx.segments[ctx.currentSegment];
		if(ctx.pc + delta > segment.end+1) {
			logError(ctx, ET_S, `ORG out of segment bounds [$${getHexWord(segment.start)} $${getHexWord(segment.end)}]`);
			return false;
		}
		if(ctx.pass==2)
			fill(ctx, delta, fillbyte);
		ctx.pc= ctx.pc + delta;
	}

	ctx.addrStr= getHexWord(ctx.pc);
	logLine(ctx);

	return true;
}
