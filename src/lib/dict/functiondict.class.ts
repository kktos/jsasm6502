import { VAParseError } from "../helpers/errors.class";
import type { TDict, TNamespace, TNamespaceDict } from "./base.type";
import type { BaseDict } from "./basedict.class";

const FUNCTIONS = Symbol("functions");
const _log = console.log;

export class FunctionDict<T extends TDict> {
	private fnStack: (string | null)[] = [];
	public current: string | null = null;

	constructor(private base: BaseDict<T>) {}

	private getFunctionDict(fromNs?: TNamespace<T>) {
		const ns = fromNs ?? this.base.currNs;
		if (!ns[FUNCTIONS]) {
			ns[FUNCTIONS] = {} as T;
		}
		return ns[FUNCTIONS] as TNamespaceDict<T>;
	}

	has(name: string, ns?: TNamespace<T>) {
		const functionDict = this.getFunctionDict(ns);
		return functionDict[name] !== undefined;
	}

	declare(name: string) {
		const functionDict = this.getFunctionDict();
		if (Object.hasOwn(functionDict, name)) {
			throw new VAParseError(`Duplicate function ${name} in ${this.base.namespace}`);
		}
		functionDict[name] = {};
	}

	enter(name: string) {
		const functionDict = this.getFunctionDict();
		if (!functionDict[name]) {
			throw new VAParseError(`Unknown function ${name}`);
		}

		this.fnStack.push(this.current);
		this.current = name;
		this.base.fn = functionDict[name];
	}

	leave() {
		// log(`leaving function ${ 	this.current}`);

		const functionDict = this.getFunctionDict();
		if (this.fnStack.length === 0) {
			throw new VAParseError("Not in a function");
		}
		this.current = this.fnStack.pop() ?? null;
		this.base.fn = this.current ? functionDict[this.current] : null;
	}

	isOneActive() {
		return this.current !== null;
	}

	dump(ns: TNamespace<T>, fnName: string) {
		const fns = ns[FUNCTIONS] as TNamespaceDict<T>;

		if (!fns) {
			return "";
		}

		const out = Object.keys(fns[fnName])
			.sort()
			.map((entry) => {
				const val = fns[fnName][entry];
				return `    ${entry}: ${val}`;
			})
			.join("\n");

		return out;
	}
}
