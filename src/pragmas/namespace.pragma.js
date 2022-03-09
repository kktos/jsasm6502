import { getIdentifier } from "../expression.js";
import { initNS, isNSExists, NS_GLOBAL } from "../namespace.js";

export function processNamespace(ctx, pragma) {
	let name;

	if(ctx.pass == 1)
		ctx.pict= "."+pragma+" ";

	if(ctx.ofs < ctx.sym.length) {
		const ident= getIdentifier(ctx.sym[ctx.ofs],0);
		name= ident.v;
	}

	ctx.currentNS= name ? name : NS_GLOBAL;

	if(!isNSExists(ctx, ctx.currentNS))
		initNS(ctx, ctx.currentNS);

	if(ctx.pass == 1)
		ctx.pict+= name;

	return true;
}
