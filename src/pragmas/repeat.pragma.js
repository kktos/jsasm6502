import { getExpression, getIdentifier } from "../expression.js";
import { ET_P, ET_S, logError, logLine } from "../log.js";
import { getNSentry } from "../namespace.js";
import { registerNextLineHandler } from "../tokenizer.js";
import { readBlock } from "./block.utils.js";

function repeatNextLine(ctx, repeatCtx) {
	if(repeatCtx.lineIdx >= repeatCtx.lines.length) {
		repeatCtx.times--;
		repeatCtx.iterator.value++;
		if(!repeatCtx.times)
			return false;
		repeatCtx.lineIdx= 0;
	}

	const line= repeatCtx.lines[repeatCtx.lineIdx++];
	ctx.rawLine= line.raw;
	ctx.sym= [...line.tokens];
	return true;
}

export function processRepeat(ctx, pragma) {

	if(ctx.pass == 1)
		ctx.pict= "."+pragma+" ";

	if(ctx.sym.length <= ctx.ofs) {
		logError(ctx, ET_S, 'repeat count expected');
		return false;
	}

	const rt= getExpression(ctx, ctx.sym[ctx.ofs]);
	ctx.pict+= rt.pict;
	if (rt.error || rt.undef) {
		if (rt.undef)
			logError(ctx, ET_P, 'undefined symbol "'+rt.undef+'"');
		else
			logError(ctx, rt.et||ET_P, rt.error);
		return false;
	}

	const iterator= { name: undefined, value: 0 }
	if(ctx.ofs+1 < ctx.sym.length) {
		const { v:name }= getIdentifier(ctx.sym[ctx.ofs+1], 0);
		if(getNSentry(ctx, "%locals%").v == null)
			getNSentry(ctx, "%locals%").v= [];
		getNSentry(ctx, "%locals%").v.push(iterator);
		iterator.name= name;
	}

	if(ctx.pass == 1)
		logLine(ctx);

	const repeatCtx= {
		lines: readBlock(ctx),
		lineIdx: 0,
		times: rt.v,
		iterator
	};
	if(repeatCtx.lines) {
		if(ctx.pass == 2 && repeatCtx.times>0)
			registerNextLineHandler(pragma, (ctx) => repeatNextLine(ctx, repeatCtx));
		return true;
	}

	logError(ctx, ET_S, "missing .END");
	return false;
}
