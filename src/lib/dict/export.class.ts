import type { TDict } from "./base.type";
import type { BaseDict } from "./basedict.class";

export class ExportDict<T extends TDict> {
	constructor(private base: BaseDict<T>) {}

	one(name: string) {
		this.base.global[name] = this.base.currNs[name] ?? { type: 0, value: 0, extra: { exported: 1 } };
		this.base.exports[name] = this.base.namespace;
	}

	many(regex: string) {
		const re = new RegExp(regex, "i");
		const list = Object.keys(this.base.currNs).filter((name) => name.match(re));
		for (const name of list) {
			this.base.global[name] = this.base.currNs[name];
			this.base.exports[name] = this.base.namespace;
		}
		return list.length;
	}

	isExported(name: string, ns?: string) {
		return Object.hasOwn(this.base.exports, name) && this.base.exports[name] === (ns ? ns : this.base.namespace);
	}
}
