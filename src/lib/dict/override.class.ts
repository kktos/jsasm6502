import type { TDict } from "./base.type";
import type { BaseDict } from "./basedict.class";

const OVERRIDDEN = Symbol("overriden");
type TOverridenDict<T> = Record<string, T[]>;

export class OverrideDict<T extends TDict> {
	constructor(private base: BaseDict<T>) {}

	override(name: string, value: T) {
		// if (this.base.ns[name]) {
		const prevValue = this.base.get(name);
		if (prevValue) {
			let overridenDict = this.base.get(OVERRIDDEN) as TOverridenDict<T>;
			if (!overridenDict) {
				overridenDict = {};
				this.base.set(OVERRIDDEN, overridenDict as T);
			}
			if (!overridenDict[name]) overridenDict[name] = [];
			overridenDict[name].push(prevValue);
		}
		return this.base.set(name, value);
	}

	restore(name: string) {
		const overridenDict = this.base.get(OVERRIDDEN) as TOverridenDict<T>;
		const value = overridenDict?.[name]?.pop();
		if (value !== undefined) {
			return this.base.set(name, value);
		}
		this.base.del(name);
	}
}
