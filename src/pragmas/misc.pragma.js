import { logLine } from "../log.js";
import { commentChar } from "../utils.js";

export function ignorePragma(ctx, pragma) {
	if(ctx.pass==1) {
		ctx.pict+= ctx.sym.join(' ');
		labelStr= '-ignored';
		logLine(ctx);
	}
}

export function processEnd(ctx, pragma) {
	ctx.pict+= "."+pragma;
	logLine(ctx);
	if(ctx.ifLevel) {
		ctx.ifLevel--;
		return true;
	}
	return false;
}

export function processPage(ctx, pragma) {
	if (ctx.pass==1) {
		ctx.pict+= "."+pragma;
		logLine(ctx);
	}
	else {
		if(ctx.comment)
			logLine(ctx);
		else
			ctx.listing+= '\n';
		if(pragma=='PAGE') {
			ctx.listing+= '                   '+(ctx.pageHead||commentChar+'page')+'  ';
			ctx.listing+= '('+(++ctx.pageCnt)+')\n\n';
		}
	}
}
