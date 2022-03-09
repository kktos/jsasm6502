
export const NS_GLOBAL= "GLOBAL";

export function initNS(ctx, name) {
	ctx.namespaces[name ? name : ctx.currentNS]= {};
}

export function getNSentry(ctx, name) {
	const nsName= isNSentryDefined(ctx, name) ? ctx.currentNS : NS_GLOBAL;
	let entry= ctx.namespaces[nsName][name];
	if(entry?.ns) {
		entry= ctx.namespaces[entry.ns][name];
	}
	return entry;
}

export function isNSentryDefined(ctx, name, log) {
	return ctx.namespaces[ctx.currentNS].hasOwnProperty(name);
}

export function setNSentry(ctx, name, value) {
	ctx.namespaces[ctx.currentNS][name]= value;
}

export function isNSExists(ctx, name) {
	return ctx.namespaces.hasOwnProperty(name);
}

export function exportNSentry(ctx, name) {
	if(ctx.currentNS == NS_GLOBAL)
		return true;

	// if(ctx.pass==2 && !isNSentryDefined(ctx, name))
	// 	return false;

	let entry= ctx.namespaces[ctx.currentNS][name];
	if(!entry)
		entry= {};

	entry["ns"]= ctx.currentNS;
	ctx.namespaces[NS_GLOBAL][name]= entry;
	return true;
}

