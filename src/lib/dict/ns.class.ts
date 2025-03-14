import type { BaseDict } from "./basedict.class";
import { NS_GLOBAL, type TDict } from "./base.type";

export class NSDict<T extends TDict> {
	private nsStack: string[] = [];

	constructor(private base: BaseDict<T>) {}

	has(name: string) {
		return this.base.namespaces[name] !== undefined;
	}

	select(nsName?: string) {
		const name = nsName ?? NS_GLOBAL;

		if (!this.base.namespaces[name]) {
			// this.base.namespaces[name] = {
			// 	[MARKERS]: [],
			// 	[NOSYMBOL]: { type: 0, value: 0 },
			// 	[OVERRIDEN]: {},
			// 	[FUNCTIONS]: {},
			// };
			this.base.namespaces[name] = {};
		}

		if (this.base.namespace) this.nsStack.push(name);
		this.base.namespace = name;
		// this.base.currNs = this.base.namespaces[this.base.namespace];
	}

	unselect() {
		this.nsStack.pop();
		this.base.namespace = this.nsStack.slice(-1).shift() ?? NS_GLOBAL;
		// this.base.currNs = this.base.namespaces[this.base.namespace];
	}

	isGlobalSelected() {
		return this.base.namespace === NS_GLOBAL;
	}
}
