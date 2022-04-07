import { ET_S, logError } from "../log.js";


export function processListing(ctx, pragma) {

	const opt= ctx.sym[ctx.ofs];

	switch(opt.toLowerCase()) {
		case "on": ctx.wannaOutput= true; break;
		case "off": ctx.wannaOutput= false; break;
		default: {
			const v= parseInt(opt);
			if(isNaN(v)) {
				logError(ctx, ET_S, "ON/OFF are the only possible options");
				return false;
			}
			ctx.wannaOutput= v!=0;
		}
	}
	
	return true;
}
