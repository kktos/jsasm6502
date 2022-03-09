import { exportNSentry } from "../namespace.js";

export function processExport(ctx, pragma) {

	if(ctx.pass == 1)
		ctx.pict= "."+pragma+" ";

	if(ctx.sym.length <= ctx.ofs) {
		logError(ctx, ET_S, 'symbol name expected');
		return false;
	}

	const name= ctx.sym[ctx.ofs];

	if(ctx.pass == 1)
		ctx.pict+= name;

	exportNSentry(ctx, name);

	return true;
}
