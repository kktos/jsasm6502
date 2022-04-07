import { getExpression } from "../expression.js";
import { ET_P, logError, logLine } from "../log.js";
import { registerNextLineHandler } from "../tokenizer.js";
import { readBlock } from "./block.utils.js";

function ifNextLine(ctx, ifCtx) {
	if(ifCtx.lineIdx >= ifCtx.lines.length)
		return false;

	const line= ifCtx.lines[ifCtx.lineIdx++];
	ctx.rawLine= line.raw;
	ctx.sym= [...line.tokens];
	return true;
}

export function processIf(ctx, pragma) {

	const expr= ctx.sym.slice(ctx.ofs).join("");

	const condValue= getExpression(ctx, expr);
	if(condValue.error) {
		logError(ctx, condValue.et||ET_P, condValue.error);
		return false;
	}

	if(ctx.pass == 1) {
		ctx.pict= "."+pragma+" "+expr;
		logLine(ctx);
	}

	const ifCtx= {
		lines: readBlock(ctx),
		lineIdx: 0
	};

	if(ifCtx.lines && condValue.v /*&& ctx.pass == 2*/)
		registerNextLineHandler(pragma, (ctx) => ifNextLine(ctx, ifCtx));

	return true;
}
