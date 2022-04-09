import { getExpression } from "../expression.js";
import { logError, logLine } from "../log.js";
import { getNSentry } from "../namespace.js";


export function processASMOuput(ctx, pragma) {

	// INTERNAL USE ONLY
	if(ctx.sym[ctx.ofs] == "%DEBUG%") {
		ctx.ofs++;
		switch(ctx.sym[ctx.ofs++]) {
			case "VAR": {
				ctx.pict= "DEBUG: " + ctx.sym[ctx.ofs]+"\n";
				ctx.pict+= JSON.stringify( getNSentry(ctx, ctx.sym[ctx.ofs]) );
				break;
			}
			case "SYM": {
				ctx.pict= "DEBUG: <" + ctx.sym.slice(3).join('> <')+">\n";
				break;
			}
		}
		ctx.wannaOutput ? logLine(ctx, true) : console.log(ctx.pict);
		return true;
	}

	let msg= "";
	while(ctx.ofs<ctx.sym.length) {
		console.log(`\nOUT expr "${ctx.sym[ctx.ofs]}"\n`);
		const r= getExpression(ctx, "");
		if(r.error) {
			logError(ctx, r.et, r.error);
			return false;
		}
		msg+= r.v;
	}

	console.log("\nOUT\n",msg,"\n");
	
	switch(pragma) {
		case "OUT":
			ctx.pict= msg;
			logLine(ctx, true);
			return true;

		case "WARNING":
			logError(ctx, "WARNING", msg, true);
			return true;

		case "ERROR":
			logError(ctx, "ERROR", msg, false);
			return false;

	}
	return false;
}
