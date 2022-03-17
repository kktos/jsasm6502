import { ET_S, logError } from "../log.js";

export function processSegment(ctx, pragma) {

	if(ctx.pass == 1)
		ctx.pict= "."+pragma+" ";

	if(ctx.sym.length <= ctx.ofs) {
		logError(ctx, ET_S, 'segment name expected');
		return false;
	}

	const name= ctx.sym[ctx.ofs];

	if(ctx.pass == 1)
		ctx.pict+= name;

	if(!ctx.segments[name]) {
		logError(ctx, ET_S, 'undefined segment');
		return false;
	}

	ctx.currentSegment= name;

	if(!ctx.code[name])
		ctx.code[name]= [];

	ctx.pc= ctx.segments[name].start + ctx.code[name].length;

	return true;
}
