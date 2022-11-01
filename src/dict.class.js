export const NS_GLOBAL= "GLOBAL";

const NOSYMBOL= Symbol("no symbol");
const OVERRIDEN= Symbol("overriden");

export class Dict {

	static MARKERS= Symbol("markers");

	constructor() {
		this.namespaces= {};
		this.select(NS_GLOBAL);
	}

	get namespace() {
		return this.currentName;
	}

	get isGlobal() {
		return this.currentName == NS_GLOBAL;
	}

	export(name) {
		const ns= this.namespaces[NS_GLOBAL];
		ns[name]= this.get(name);
	}

	exportMany(regex) {
		const globalNS= this.namespaces[NS_GLOBAL];
		const re= new RegExp(regex, "i");
		const list= Object.keys(this.ns).filter(name => name.match(re));
		list.forEach(name => globalNS[name]= this.get(name));
		return list.length;
	}

	set(name, value) {
		// console.log("Dict.set", this.currentName, name);
		this.ns[name]= value;
	}

	get(name, ns=null) {
		if(ns)
			return this.namespaces[ns]?.[name];		
		return this.ns[name];
	}

	override(name, value) {
		if(this.ns[name]) {
			if(!this.ns[OVERRIDEN])
				this.ns[OVERRIDEN]= {};
			if(!this.ns[OVERRIDEN][name])
				this.ns[OVERRIDEN][name]= [];
			this.ns[OVERRIDEN][name].push(this.ns[name]);
		}
		return this.set(name, value);
	}
	restore(name) {
		const value= this.ns[OVERRIDEN]?.[name]?.pop();
		if(!value)
			return;
		return this.set(name, value);
	}

	getCheap(entryName, name) {
		let entry= this.ns[entryName];
		if(!entry)
			entry= this.ns[NOSYMBOL];

		// console.log("getCheap", entry, name, entry.cheaps[name]);

		return {...entry.cheaps[name]};
	}

	addCheap(entryName, name, value) {
		let entry= this.ns[entryName];
		if(!entry) {
			if(!this.ns[NOSYMBOL])
				this.ns[NOSYMBOL]= { name:"NOSYMBOL" };
			entry= this.ns[NOSYMBOL];
		}
		if(!entry.cheaps)
			entry.cheaps= {};
		if(entry.cheaps[name])
			return false;

		entry.cheaps[name]= {...value, cheap:true};

		// console.log("addCheap", entry, name, entry.cheaps[name]);

		return true;
	}

	addMarker(mark) {
		let markers= this.get(MARKERS);
		if(!markers) {
			markers= [];
			this.set(MARKERS, markers);
		}
		markers.push(mark);
	}

	findClosestMarker(target, distance) {
		let markers= this.get(MARKERS);
		let pos= markers.findIndex((marker) => marker>target);
		pos= distance<0 ? pos+distance : pos-1+distance;
		return markers[pos];
	}

	nsExists(name) {
		return this.namespaces[name] != undefined;
	}

	exists(name, ns=null) {
		if(ns)
			return this.namespaces[ns]?.[name] != undefined;
		return this.ns[name] != undefined;
	}

	select(name) {
		if(!this.namespaces[name]) {
			this.namespaces[name]= {};
		}
		this.currentName= name;
		this.ns= this.namespaces[this.currentName];
	}

}