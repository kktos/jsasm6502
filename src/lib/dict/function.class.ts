import { VAParseError } from "../helpers/errors.class";
import type { BaseDict } from "./base.class";
import type { TDict, TNamespaceDict } from "./base.type";

const FUNCTIONS = Symbol("functions");

export class FunctionDict<T extends TDict> {
	private fnStack: (string | null)[] = [];
	public current: string | null = null;

	constructor(private base: BaseDict<T>) {}

	private getFunctionDict() {
		if (!this.base.currNs[FUNCTIONS]) {
			this.base.currNs[FUNCTIONS] = {} as T;
		}
		return this.base.currNs[FUNCTIONS] as TNamespaceDict<T>;
	}

	has(name: string) {
		const functionDict = this.getFunctionDict();
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
}
