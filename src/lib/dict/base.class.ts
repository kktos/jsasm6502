import { type TDict, NS_GLOBAL, type TNamespaceDict, type TNamespace, type TNamespaceKey } from "./base.type";

const log = console.log;

export class BaseDict<T extends TDict> {
	public namespace = NS_GLOBAL;
	public exports: Record<string, string> = {};

	static newBaseDict<T extends TDict>() {
		const namespaces = { [NS_GLOBAL]: {} };
		const fn = null;
		return new BaseDict<T>(namespaces, fn);
	}

	constructor(
		public namespaces: TNamespaceDict<T>,
		public fn: TNamespace<T> | null,
	) {}

	get global() {
		return this.namespaces[NS_GLOBAL];
	}

	get currNs() {
		return this.namespaces[this.namespace];
	}

	// get(name: typeof MARKERS, ns?: string): number[];
	// get(name: typeof MARKERS | string, ns?: string): T | number[]
	get(name: TNamespaceKey, ns?: string): T | undefined {
		if (ns) return this.namespaces[ns]?.[name];
		return this.fn?.[name] ?? this.currNs[name] ?? this.global[name];
	}

	set(name: TNamespaceKey, value: T) {
		// log(`---- SET ${this.namespace}.${String(name)}= ${value.value}`);
		// log("NS", this.namespace, JSON.stringify(this.currNs));
		// log("GLOBAL", JSON.stringify(this.global));

		if (this.fn) {
			this.fn[name] = value;
		} else {
			this.currNs[name] = value;

			// log(`---- DONE ${this.namespace}.${String(name)}= ${this.currNs[name]}`);
			// log(`---- isGlobal ${this.global === this.currNs}`);

			if (typeof name === "string" && this.exports[name] === this.namespace) {
				// const exported = this.global[name]?.extra?.exported;
				this.global[name] = value;
				// if (typeof exported === "number" && value?.extra) {
				// 	value.extra.exported = exported;
				// }
			}
		}
	}

	del(name: TNamespaceKey) {
		if (this.fn) {
			delete this.fn[name];
		} else {
			delete this.currNs[name];
		}
	}

	search(name: string) {
		const matches: string[] = [];
		for (const ns of Object.keys(this.namespaces)) {
			if (this.namespaces[ns][name]) matches.push(ns);
		}
		return matches;
	}

	exists(name: string, ns?: string, fn?: string) {
		// log("exists", name, ns, fn, "in fn",(this.fn && Object.hasOwn(this.fn, name)),"in ns", Object.hasOwn(this.currNs, name), "in Global", Object.hasOwn(this.global, name));
		// log("NS", this.namespace, JSON.stringify(this.currNs));
		// log("GLOBAL", JSON.stringify(this.global));

		if (fn) return Object.hasOwn(this.currNs[fn], name);

		if (ns) return Object.hasOwn(this.namespaces[ns], name);

		return (
			(this.fn && Object.hasOwn(this.fn, name)) || Object.hasOwn(this.currNs, name) || Object.hasOwn(this.global, name)
		);
	}
}
