import { BaseDict } from "./basedict.class";
import type { TDict, TNamespaceKey } from "./base.type";
import { ExportDict } from "./export.class";
import { FunctionDict } from "./functiondict.class";
import { MarkerDict } from "./markerdict.class";
import { NSDict } from "./ns.class";
import { OverrideDict } from "./override.class";

const log = console.log;

export class Dict<T extends TDict> {
	static newDict<T extends TDict>() {
		const dict = BaseDict.newBaseDict<T>();
		const marker = new MarkerDict<T>(dict);
		const override = new OverrideDict<T>(dict);
		const ns = new NSDict<T>(dict);
		const fn = new FunctionDict<T>(dict);
		const exp = new ExportDict<T>(dict);
		return new Dict<T>(dict, marker, override, ns, fn, exp);
	}

	constructor(
		private base: BaseDict<T>,
		public marker: MarkerDict<T>,
		public override: OverrideDict<T>,
		public ns: NSDict<T>,
		public fn: FunctionDict<T>,
		private exp: ExportDict<T>,
	) {}

	exists(name: string, ns?: string, fn?: string) {
		return this.base.exists(name, ns, fn);
	}
	search(name: string) {
		return this.base.search(name);
	}
	get namespace() {
		return this.base.namespace;
	}
	get(name: TNamespaceKey, ns?: string): T | undefined {
		return this.base.get(name, ns);
	}
	set(name: TNamespaceKey, value: T) {
		return this.base.set(name, value);
	}
	get export() {
		return this.exp;
	}

	dump() {
		let out = "";
		for (const name of Object.keys(this.base.namespaces).sort()) {
			const ns = this.base.namespaces[name];
			const entries = Object.keys(ns).sort();

			if (entries.length) out += `${name}:\n`;

			out += entries
				.map((entry) => {
					const val = ns[entry];
					return `  ${entry}: ${val}`;
				})
				.join("\n");
			out += "\n";

			// for (const entry of entries) {
			// const val = ns[entry];
			// out += `  ${entry}: ${val}`;
			// out += this.exp.isExported(entry, name) ? "exported" : "";

			// out += getTypeName(val?.type).toLowerCase();
			// switch (val?.type) {
			// 	case TOKEN_TYPES.ARRAY:
			// 		out += ` = ${val?.value}`;
			// 		break;
			// 	case TOKEN_TYPES.STRING:
			// 		out += ` = "${val?.value}"`;
			// 		break;
			// 	default:
			// 		out += ` = $${val?.value.toString(16).toUpperCase()}`;
			// }

			// if (val?.extra) {
			// 	out += ` ;${this.isExported(entry, name) ? "exported from" : ""} "${val?.extra?.file}":${val?.extra?.line}\n`;
			// }
			// }
		}

		// out += "\n";

		// for (const key of Object.keys(this.exports)) {
		// 	out += `${key} = ${this.exports[key]}\n`;
		// }

		// log("DUMP");
		// log(out);

		return out;
	}
}
