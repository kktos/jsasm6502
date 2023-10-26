import { VAParseError } from "./helpers/errors.class";
import { TOKEN_TYPES, getTypeName } from "./lexer/token.class";
import { TExprStackItem } from "./parsers/expression.parser";

export const NS_GLOBAL = "GLOBAL";
const FN_ALL = "*";

const NOSYMBOL = Symbol("no symbol");
const OVERRIDEN = Symbol("overriden");
const MARKERS = Symbol("markers");
const FUNCTIONS = Symbol("functions");

type TLocalDict = TExprStackItem & { isLocal: boolean };
export type TDictValue = TExprStackItem & { localDict?: Record<string, TLocalDict> };

type TOverridenDict = Record<typeof OVERRIDEN, Record<string, TDictValue[]>>;
type TMarkerDict = Record<typeof MARKERS, number[]>;
type TNamespaceEntry = Record<TModuleKey, TDictValue> & TOverridenDict & TMarkerDict;

type TFunctionDict = Record<typeof FUNCTIONS, Record<string, TNamespaceEntry>>;

type TModuleKey = string | typeof NOSYMBOL;
type TModuleEntry = TNamespaceEntry & TFunctionDict;
type TModuleDict = Record<string, TModuleEntry>;

const globalNS: TModuleEntry = {
	[MARKERS]: [],
	[OVERRIDEN]: {},
	[NOSYMBOL]: { type: 0, value: 0 },
	[FUNCTIONS]: {},
};

const log = console.log;

export class Dict {
	private exports: Record<string, string> = {};
	private nsStack: string[] = [];
	private fnStack: string[] = [];
	private currentNamespace = NS_GLOBAL;
	private currentFunction = FN_ALL;
	private fn: TNamespaceEntry | null = null;

	constructor(
		private global = { ...globalNS },
		private ns: TModuleEntry = global,
		private namespaces: TModuleDict = { [NS_GLOBAL]: global },
	) {
		this.global = { ...globalNS };
		this.ns = this.global;
		this.namespaces = { [NS_GLOBAL]: this.global };

		this.nsSelect(NS_GLOBAL);
		if (!this.global) throw new Error(`NO GLOBAL !?! ${this}`);
	}

	get namespace() {
		return this.currentNamespace;
	}

	get isGlobal() {
		return this.currentNamespace === NS_GLOBAL;
	}

	export(name: string) {
		this.global[name] = this.ns[name] ?? { type: 0, value: 0, extra: { exported: 1 } };
		this.exports[name] = this.currentNamespace;
	}

	exportMany(regex: string) {
		const re = new RegExp(regex, "i");
		const list = Object.keys(this.ns).filter((name) => name.match(re));
		for (const name of list) {
			this.global[name] = this.ns[name];
			this.exports[name] = this.currentNamespace;
		}
		return list.length;
	}

	isExported(name: string, ns?: string) {
		return Object.hasOwn(this.exports, name) && this.exports[name] === (ns ? ns : this.currentNamespace);
	}

	set(name: string, value: TExprStackItem) {
		// log(`---- SET ${this.currentName}.${name}= ${value.value}`);

		if (this.fn) {
			this.fn[name] = value;
		} else {
			this.ns[name] = value;
			if (this.exports[name] === this.currentNamespace) {
				const exported = this.global[name]?.extra?.exported;
				this.global[name] = value;
				if (typeof exported === "number" && value?.extra) {
					value.extra.exported = exported;
				}
			}
		}
	}

	get(name: string, ns?: string): TDictValue;
	get(name: typeof MARKERS, ns?: string): number[];
	get(name: typeof MARKERS | string, ns?: string): TDictValue | number[] {
		if (ns) return this.namespaces[ns]?.[name];
		return this.fn?.[name] ?? this.ns[name] ?? this.global[name];
	}

	search(name: string) {
		const matches: string[] = [];
		for (const ns of Object.keys(this.namespaces)) {
			if (this.namespaces[ns][name]) matches.push(ns);
		}
		return matches;
	}

	nsHasFunction(name: string) {
		return this.ns[FUNCTIONS][name] !== undefined;
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

		// log("findClosestMarker",{ns:this.currentName, markers, target, distance});

		let pos = markers.findIndex((marker) => marker > target);

		// log("findClosestMarker",{pos});

		if (pos < 0) {
			if (distance > 0) return null;
			pos = markers.length - 1;
		} else pos = distance < 0 ? pos + distance : pos - 1 + distance;

		// console.log("findClosestMarker",{pos});
		// console.log("findClosestMarker",{marker: markers[pos]});

		return markers[pos];
	}

	exists(name: string, ns: string | null = null) {
		if (ns) return this.fn ? Object.hasOwn(this.fn, name) : Object.hasOwn(this.namespaces[ns], name);
		return (
			(this.fn && Object.hasOwn(this.fn, name)) || Object.hasOwn(this.ns, name) || Object.hasOwn(this.global, name)
		);
	}

	nsExists(name: string) {
		return this.namespaces[name] !== undefined;
	}

	nsSelect(nsName?: string) {
		const name = nsName ?? NS_GLOBAL;

		if (!this.namespaces[name]) {
			this.namespaces[name] = {
				[MARKERS]: [],
				[NOSYMBOL]: { type: 0, value: 0 },
				[OVERRIDEN]: {},
				[FUNCTIONS]: {},
			};
		}

		if (this.currentNamespace) this.nsStack.push(name);
		this.currentNamespace = name;
		this.ns = this.namespaces[this.currentNamespace];
	}

	nsUnselect() {
		this.nsStack.pop();
		this.currentNamespace = this.nsStack.slice(-1).shift() ?? NS_GLOBAL;
		this.ns = this.namespaces[this.currentNamespace];
	}

	fnDeclare(name: string) {
		if (Object.hasOwn(this.ns[FUNCTIONS], name)) {
			throw new VAParseError(`Duplicate function ${name} in ${this.currentNamespace}`);
		}
		this.ns[FUNCTIONS][name] = {
			[MARKERS]: [],
			[NOSYMBOL]: { type: 0, value: 0 },
			[OVERRIDEN]: {},
		};
	}

	fnEnter(name: string) {
		if (!this.ns[FUNCTIONS][name]) {
			throw new VAParseError(`Unknown function ${name}`);
		}

		this.fnStack.push(this.currentFunction);
		this.currentFunction = name;
		this.fn = this.ns[FUNCTIONS][name];
	}

	fnLeave() {
		if (this.fnStack.length === 0) {
			throw new VAParseError("Not in a function");
		}
		this.currentFunction = this.fnStack.pop() ?? FN_ALL;
		this.fn = this.currentFunction !== FN_ALL ? this.ns[FUNCTIONS][this.currentFunction] : null;
	}

	fnIsOneActive() {
		return this.fn !== null;
	}

	dump() {
		let out = "";
		for (const name of Object.keys(this.namespaces).sort()) {
			const ns = this.namespaces[name];
			const entries = Object.keys(ns).sort();

			if (entries.length) out += `${name}:\n`;

			for (const entry of entries) {
				const val = ns[entry];
				out += `  ${entry}: `;
				out += getTypeName(val?.type).toLowerCase();
				switch (val?.type) {
					case TOKEN_TYPES.ARRAY:
						out += ` = ${val?.value}`;
						break;
					case TOKEN_TYPES.STRING:
						out += ` = "${val?.value}"`;
						break;
					default:
						out += ` = $${val?.value.toString(16).toUpperCase()}`;
				}

				if (val?.extra) {
					out += ` ;${this.isExported(entry, name) ? "exported from" : ""} "${val?.extra?.file}":${val?.extra?.line}\n`;
				}
			}
		}

		// out += "\n";

		// for (const key of Object.keys(this.exports)) {
		// 	out += `${key} = ${this.exports[key]}\n`;
		// }

		return out;
	}
}
