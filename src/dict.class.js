import { TOKEN_TYPES } from "./lexer/lexer.class.js";
import { getTypeName } from "./lexer/token.class.js";

export const NS_GLOBAL = "GLOBAL";

const NOSYMBOL = Symbol("no symbol");
const OVERRIDEN = Symbol("overriden");
const MARKERS = Symbol("markers");

// const log= console.log;

export class Dict {
	constructor() {
		this.namespaces = {};
		this.select(NS_GLOBAL);
		this.global = this.namespaces[NS_GLOBAL];
		this.exports = {};
		this.nsStack = [];
	}

	get namespace() {
		return this.currentName;
	}

	get isGlobal() {
		return this.currentName === NS_GLOBAL;
	}

	export(name) {
		this.global[name] = this.ns[name];
		this.exports[name] = this.currentName;
	}

	exportMany(regex) {
		const re = new RegExp(regex, "i");
		const list = Object.keys(this.ns).filter((name) => name.match(re));
		list.forEach((name) => {
			this.global[name] = this.ns[name];
			this.exports[name] = this.currentName;
		});
		return list.length;
	}

	set(name, value) {
		// log(`---- SET ${this.currentName}.${name}= ${value.value}`);

		this.ns[name] = value;

		if (this.exports[name] === this.currentName) this.global[name] = value;
	}

	get(name, ns = null) {
		if (ns) return this.namespaces[ns]?.[name];
		return this.ns[name] ? this.ns[name] : this.global[name];
	}

	search(name) {
		const matches = [];
		Object.keys(this.namespaces).forEach((ns) => {
			if (this.namespaces[ns][name]) matches.push(ns);
		});
		return matches;
	}

	override(name, value) {
		if (this.ns[name]) {
			if (!this.ns[OVERRIDEN]) this.ns[OVERRIDEN] = {};
			if (!this.ns[OVERRIDEN][name]) this.ns[OVERRIDEN][name] = [];
			this.ns[OVERRIDEN][name].push(this.ns[name]);
		}
		return this.set(name, value);
	}
	restore(name) {
		const value = this.ns[OVERRIDEN]?.[name]?.pop();
		if (!value) {
			delete this.ns[name];
			return;
		}
		return this.set(name, value);
	}

	getCheap(entryName, name) {
		let entry = this.ns[entryName];
		if (!entry) entry = this.ns[NOSYMBOL];

		// console.log("getCheap", entry, name, entry.cheaps[name]);

		return { ...entry.cheaps[name] };
	}

	addCheap(entryName, name, value) {
		let entry = this.ns[entryName];
		if (!entry) {
			if (!this.ns[NOSYMBOL]) this.ns[NOSYMBOL] = { name: "NOSYMBOL" };
			entry = this.ns[NOSYMBOL];
		}
		if (!entry.cheaps) entry.cheaps = {};
		if (entry.cheaps[name]) return false;

		entry.cheaps[name] = { ...value, cheap: true };

		// console.log("addCheap", entry, name, entry.cheaps[name]);

		return true;
	}

	addMarker(mark) {
		const markers = this.get(MARKERS);
		markers.push(mark);
		// console.log("addMarker",{ns:this.currentName, markers});
	}

	findClosestMarker(target, distance) {
		const markers = this.get(MARKERS);

		// console.log("findClosestMarker",{ns:this.currentName, markers, target, distance});

		let pos = markers.findIndex((marker) => marker > target);

		// console.log("findClosestMarker",{pos});

		if (pos < 0) {
			if (distance > 0) return null;
			pos = markers.length - 1;
		} else pos = distance < 0 ? pos + distance : pos - 1 + distance;

		// console.log("findClosestMarker",{pos});
		// console.log("findClosestMarker",{marker: markers[pos]});

		return markers[pos];
	}

	nsExists(name) {
		return this.namespaces[name] !== undefined;
	}

	exists(name, ns = null) {
		if (ns) return Object.hasOwn(this.namespaces[ns], name);

		return Object.hasOwn(this.ns, name) || Object.hasOwn(this.global, name);
	}

	select(name) {
		const nsName = name ?? NS_GLOBAL;

		if (!this.namespaces[nsName]) {
			this.namespaces[nsName] = {};
			this.namespaces[nsName][MARKERS] = [];
		}

		if (this.currentName) this.nsStack.push(nsName);

		this.currentName = nsName;
		this.ns = this.namespaces[this.currentName];
	}

	nsPop() {
		this.nsStack.pop();
		this.currentName = this.nsStack.slice(-1).shift();
		this.ns = this.namespaces[this.currentName];
	}

	dump() {
		let out = "";
		Object.keys(this.namespaces).forEach((name) => {
			out += `${name}:\n`;

			const ns = this.namespaces[name];
			Object.keys(ns).forEach((entry) => {
				const val = ns[entry];
				out += `  ${entry}: `;
				out += getTypeName(val.type).toLowerCase();
				switch(val.type) {
					case TOKEN_TYPES.ARRAY:
						out += ` = ${val.value}\n`;
						break;
					default:
						out += ` = $${val.value.toString(16).toUpperCase()}\n`;
				}
			});
		});
		return out;
	}
}
