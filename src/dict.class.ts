import { TOKEN_TYPES, getTypeName } from "./lexer/token.class";
import { TExprStackItem } from "./parsers/expression.parser";

export const NS_GLOBAL = "GLOBAL";

const NOSYMBOL = Symbol("no symbol");
const OVERRIDEN = Symbol("overriden");
const MARKERS = Symbol("markers");

type TLocalDict = TExprStackItem & { isLocal: boolean };
type TDictValue = TExprStackItem & { localDict?: Record<string, TLocalDict> };

type TOverridenDict = Record<typeof OVERRIDEN, Record<string, TDictValue[]>>;
type TMarkersDict = Record<typeof MARKERS, number[]>;

type TNamespaceEntry = string | typeof NOSYMBOL;
type TNamespace = Record<TNamespaceEntry, TDictValue> & TOverridenDict & TMarkersDict;
type TNamespaceDict = Record<string, TNamespace>;

const globalNS: TNamespace = {
	[MARKERS]: [],
	[OVERRIDEN]: {},
	[NOSYMBOL]: { type: 0, value: 0 },
};

const log = console.log;

export class Dict {
	private exports: Record<string, string> = {};
	private nsStack: string[] = [];
	private currentName = NS_GLOBAL;

	constructor(
		private global = { ...globalNS },
		private ns: TNamespace = global,
		private namespaces: TNamespaceDict = { [NS_GLOBAL]: global },
	) {
		this.select(NS_GLOBAL);
		if (!this.global) throw new Error(`NO GLOBAL !?! ${this}`);
	}

	get namespace() {
		return this.currentName;
	}

	get isGlobal() {
		return this.currentName === NS_GLOBAL;
	}

	export(name: string) {
		this.global[name] = this.ns[name];
		this.exports[name] = this.currentName;
	}

	exportMany(regex: string) {
		const re = new RegExp(regex, "i");
		const list = Object.keys(this.ns).filter((name) => name.match(re));
		for (const name of list) {
			this.global[name] = this.ns[name];
			this.exports[name] = this.currentName;
		}
		return list.length;
	}

	set(name: string, value: TExprStackItem) {
		// log(`---- SET ${this.currentName}.${name}= ${value.value}`);

		this.ns[name] = value;

		if (this.exports[name] === this.currentName) this.global[name] = value;
	}

	get(name: string, ns?: string): TDictValue;
	get(name: typeof MARKERS, ns?: string): number[];
	get(name: typeof MARKERS | string, ns?: string): TDictValue | number[] {
		if (ns) return this.namespaces[ns]?.[name];
		return this.ns[name] ? this.ns[name] : this.global[name];
	}

	search(name: string) {
		const matches: string[] = [];
		for (const ns of Object.keys(this.namespaces)) {
			if (this.namespaces[ns][name]) matches.push(ns);
		}
		return matches;
	}

	override(name: string, value: TExprStackItem) {
		if (this.ns[name]) {
			if (!this.ns[OVERRIDEN][name]) this.ns[OVERRIDEN][name] = [];
			this.ns[OVERRIDEN][name].push(this.ns[name]);
		}
		return this.set(name, value);
	}
	restore(name: string) {
		const value = this.ns[OVERRIDEN]?.[name]?.pop();
		if (!value) {
			delete this.ns[name];
			return;
		}
		return this.set(name, value);
	}

	getLocal(entryName: string, name: string) {
		let entry = this.ns[entryName];
		if (!entry) entry = this.ns[NOSYMBOL];

		// console.log("getLocal", entry, name, entry.localDict[name]);

		return { ...entry.localDict?.[name] } as TExprStackItem;
	}

	addLocal(entryName: string, name: string, value: TExprStackItem) {
		let entry = this.ns[entryName];
		if (!entry) {
			entry = this.ns[NOSYMBOL];
		}
		if (!entry.localDict) entry.localDict = {};
		if (entry.localDict[name]) return false;

		entry.localDict[name] = { ...value, isLocal: true };

		// console.log("addLocal", entry, name, entry.localDict[name]);

		return true;
	}

	addMarker(mark: number) {
		const markers = this.get(MARKERS);
		markers.push(mark);
		// console.log("addMarker",{ns:this.currentName, markers});
	}

	findClosestMarker(target: number, distance: number) {
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

	nsExists(name: string) {
		return this.namespaces[name] !== undefined;
	}

	exists(name: string, ns: string | null = null) {
		if (ns) return Object.hasOwn(this.namespaces[ns], name);

		if (!this.global) throw new Error(`NO GLOBAL ${name} ${this.global}`);

		return Object.hasOwn(this.ns, name) || Object.hasOwn(this.global, name);
	}

	select(name?: string) {
		const nsName = name ?? NS_GLOBAL;

		if (!this.namespaces[nsName]) {
			this.namespaces[nsName] = {
				[MARKERS]: [],
				[NOSYMBOL]: { type: 0, value: 0 },
				[OVERRIDEN]: {},
			};
		}

		if (this.currentName) this.nsStack.push(nsName);

		this.currentName = nsName;
		this.ns = this.namespaces[this.currentName];
	}

	nsPop() {
		this.nsStack.pop();
		this.currentName = this.nsStack.slice(-1).shift() ?? NS_GLOBAL;
		this.ns = this.namespaces[this.currentName];
	}

	dump() {
		let out = "";
		for (const name of Object.keys(this.namespaces).sort()) {
			out += `${name}:\n`;

			const ns = this.namespaces[name];
			for (const entry of Object.keys(ns).sort()) {
				const val = ns[entry];
				out += `  ${entry}: `;
				out += getTypeName(val.type).toLowerCase();
				switch (val.type) {
					case TOKEN_TYPES.ARRAY:
						out += ` = ${val.value}\n`;
						break;
					default:
						out += ` = $${val.value.toString(16).toUpperCase()}\n`;
				}
			}
		}
		return out;
	}
}
