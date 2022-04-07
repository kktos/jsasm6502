
// const NS_TEMPORARY= "%locals%";
export const NS_GLOBAL= "GLOBAL";

let tempVars= [];

export function initNS(ctx, name) {
	name= name ?? NS_GLOBAL;
	ctx.namespaces[name]= {};

	// if(name==NS_GLOBAL) {
	// 	setNSentry(ctx, "%locals%", { v: null, isPrivate: true });
	// }

}

export function getNSentry(ctx, name) {

	let nsName;

	if(name.indexOf(".")>=0) {
		[nsName, name]= name.split(".");
		if(!isNSExists(ctx, nsName))
			return null;
	} else {
		nsName= isNSentryDefined(ctx, name) ? ctx.currentNS : NS_GLOBAL;
	}

	let entry= ctx.namespaces[nsName][name];
	if(entry?.ns) {
		entry= ctx.namespaces[entry.ns][name];
	}
	return entry;
}

export function isNSentryDefined(ctx, name) {
	return ctx.namespaces[ctx.currentNS].hasOwnProperty(name);
}

export function getNSentryInfo(ctx, name) {
	const entry= getNSentry(ctx, name);
	return entry["_"];
}

export function setNSentry(ctx, name, value) {
	value["_"]= {src: ctx.filename, line: ctx.srcLineIdx};
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

export function exportNSentries(ctx, regex) {
	if(ctx.currentNS == NS_GLOBAL)
		return true;

	const re= new RegExp(regex, "i");
	const names= Object.keys(ctx.namespaces[ctx.currentNS]).filter(k => k.match(re));

	names.forEach(name => exportNSentry(ctx, name));
}

export function setNStempEntry(ctx, name, value) {
	const entry= typeof name == "object" ? name : {name, value};
	tempVars.unshift(entry);
	return entry;
}

export function getNStempEntry(ctx, name) {
	return tempVars.find(def => def.name == name);
}

export function delNStempEntry(ctx, name) {
	const idx= tempVars.findIndex(def => def.name == name);
	if(idx>=0)
		tempVars.splice(idx, 1);
}