export function fnLen(ctx, parms) {

	console.log("fnLen", parms, typeof parms);

	switch(typeof parms) {
		case "string":
			return parms.length;
		case "object":
			return Array.isArray(parms) ? parms.length : 0;
		default:
			return 0;
	}
}
