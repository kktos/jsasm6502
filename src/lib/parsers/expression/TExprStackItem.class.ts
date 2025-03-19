import { TOKEN_TYPES, Token, getTypeName } from "../../lexer/token.class";
import type { IExprItem } from "../../types/ExprItem.type";
import type { TValue, TValueType } from "../../types/Value.type";
import type { TExprStackOperation } from "./expression.type";

type TExtra = {
	file?: string;
	line?: number;
	isVariable: boolean;
	exported?: number;
	tokens?: Token[];
};

type DumpOptions = {
	withType: boolean;
};

export class TExprStackItem implements IExprItem {
	val: TValue;
	op?: TExprStackOperation;
	fn?: string;
	paramCount?: number;
	extra?: TExtra;

	static newFunction(name: string, paramCount: number) {
		const item = new TExprStackItem(0, 0);
		item.op = "FN";
		item.fn = name;
		item.paramCount = paramCount;
		return item;
	}

	static newNumber(value: number) {
		return new TExprStackItem(TOKEN_TYPES.NUMBER, value);
	}

	static newString(value: string) {
		return new TExprStackItem(TOKEN_TYPES.STRING, value);
	}

	static newObject(value: Record<string, unknown>) {
		return new TExprStackItem(TOKEN_TYPES.OBJECT, value);
	}

	static newArray(value: unknown[]) {
		return new TExprStackItem(TOKEN_TYPES.ARRAY, value);
	}

	static fromToken(tok: Token) {
		return new TExprStackItem(tok.type ?? 0, tok.value);
	}

	static duplicate(item: TExprStackItem) {
		return new TExprStackItem(item.type ?? 0, item.value);
	}

	constructor(typeOrToken: number | Token, value: TValueType, op?: TExprStackOperation) {
		if (typeOrToken instanceof Token) {
			this.val = typeOrToken;
		} else {
			this.val = { type: typeOrToken, value };
		}
		this.op = op;
	}

	renew(type: number, value: TValueType, extra?: TExtra) {
		this.val = { type, value };
		if (extra) this.extra = extra;
	}

	get type() {
		return this.val.type;
	}

	get typeAsString() {
		return getTypeName(this.val.type ?? 0).toLowerCase();
	}

	get value() {
		return this.val.value;
	}

	get number() {
		return this.val.value as number;
	}

	set number(v: number) {
		this.val.value = v;
	}

	get isDefined() {
		return this.val.type !== 0;
	}

	get string() {
		return this.val.value as string;
	}

	get array() {
		return this.val.value as unknown[];
	}

	static asString(obj: TExprStackItem, options: DumpOptions = { withType: true }) {
		let type: string | null = getTypeName(obj.val?.type ?? 0).toLowerCase();
		let out = "";
		switch (obj.val?.type) {
			case TOKEN_TYPES.ARRAY: {
				// out += "[";
				const items = [];
				for (const item of obj.val.value as unknown[]) {
					if (item instanceof TExprStackItem) {
						// out += TExprStackItem.asString(item).replace("\n","");
						items.push(TExprStackItem.asString(item));
					} else {
						// out += JSON.stringify(item);
						items.push(JSON.stringify(item));
					}
					// out += ", ";
				}
				// out += "]";
				out += `[${items.join(", ")}]`;
				break;
			}
			case TOKEN_TYPES.STRING:
				out += `"${obj.string}"`;
				break;
			case TOKEN_TYPES.OBJECT:
				type = null;
				out += `${obj.val.value instanceof TExprStackItem ? obj.val.value : JSON.stringify(obj.val.value)}`;
				break;
			default:
				out += `$${obj.number?.toString(16).toUpperCase()}`;
		}
		if (obj.extra) {
			out += ` ; "${obj.extra?.file}":${obj.extra?.line}`;
		}
		return `${options.withType && type ? `${type} = ` : ""}${out}`;
	}

	toString() {
		return TExprStackItem.asString(this);
	}

	[Symbol.for("nodejs.util.inspect.custom")](/*depth, inspectOptions, inspect*/) {
		return TExprStackItem.asString(this);
	}
}
