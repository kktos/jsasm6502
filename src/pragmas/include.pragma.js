import { getExpression } from "../expression.js";
import { ET_C, ET_S, logError, logLine } from "../log.js";
import { registerNextLineHandler, tokenizeNextLine } from "../tokenizer.js";


export function processInclude(ctx, pragma) {

	ctx.pict= "."+pragma;

	if(ctx.sym.length <= ctx.ofs) {
		logError(ctx, ET_S, 'filename expected');
		return false;
	}

	const r= getExpression(ctx, ctx.sym[ctx.ofs]);
	if(r.error) {
		logError(ctx, r.et, r.error);
		return false;
	}
	const filename= r.v;
	ctx.pict+= " "+filename;
	logLine(ctx);

	const fileSrc= ctx.readFile(filename, ctx.filename);

	if(fileSrc == null) {
		logError(ctx, ET_C, "Unable to include "+filename);
		return false;
	}

	// console.log({filename, fileSrc});

	const includeCtx= {
		codeSrc: ctx.codesrc,
		srcLineIdx: ctx.srcLineIdx,
		srcc: ctx.srcc,
		filename: ctx.filename
	}

	ctx.srcLineIdx= ctx.srcc= 0;
	ctx.codesrc= fileSrc;
	ctx.filename= filename;

	registerNextLineHandler(filename, () => nextIncludeLine(ctx, includeCtx));

	return true;
}

function nextIncludeLine(ctx, includeCtx) {
	ctx.sym= tokenizeNextLine(ctx);
	if(ctx.sym == null) {
		ctx.codesrc= includeCtx.codeSrc,
		ctx.srcLineIdx= includeCtx.srcLineIdx,
		ctx.srcc= includeCtx.srcc,
		ctx.filename= includeCtx.filename
		return false;
	}
	return true;
}
