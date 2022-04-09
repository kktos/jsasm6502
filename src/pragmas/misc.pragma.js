import { logLine, logMsg } from "../log.js";
import { COMMENT_CHAR } from "../utils.js";

export function ignorePragma(ctx, pragma) {
	if(ctx.pass==1) {
		ctx.pict+= ctx.sym.join(' ');
		ctx.labelStr= '-ignored';
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
			logMsg('\n');
		if(pragma=='PAGE') {
			logMsg('                   '+(ctx.pageHead||COMMENT_CHAR+'page')+'  ');
			logMsg('('+(++ctx.pageCnt)+')\n\n');
		}
	}
}
