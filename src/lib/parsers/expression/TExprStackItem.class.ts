import { TOKEN_TYPES, Token, getTypeName } from "../../lexer/token.class";
import { IExprItem } from "../../types/ExprItem.type";
import { TValue, TValueType } from "../../types/Value.type";
import { TExprStackOperation } from "./expression.type";

type TExtra = {
	file?: string;
	line?: number;
	isVariable: boolean;
	exported?: number;
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

	constructor(typeOrToken: number | Token, value: TValueType, op?: TExprStackOperation) {
		if (typeOrToken instanceof Token) {
			this.val = typeOrToken;
		} else {
			this.val = { type: typeOrToken, value };
		}
		this.op = op;
	}

	renew(type: number, value: TValueType) {
		this.val = { type, value };
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

	static asString(obj: TExprStackItem) {
		let out = getTypeName(obj.val.type ?? 0).toLowerCase();
		switch (obj.val.type) {
			case TOKEN_TYPES.ARRAY:
				out += " = [";
				for (const item of obj.val.value as unknown[]) {
					if (item instanceof TExprStackItem) {
						out += TExprStackItem.asString(item);
					} else {
						out += JSON.stringify(item);
					}
					out += ", ";
				}
				out += "]";
				break;
			case TOKEN_TYPES.STRING:
				out += ` = "${obj.string}"`;
				break;
			default:
				out += ` = $${obj.number?.toString(16).toUpperCase()}`;
		}
		if (obj.extra) {
			out += ` ; "${obj.extra?.file}":${obj.extra?.line}`;
		}
		return `${out}\n`;
	}

	toString() {
		return TExprStackItem.asString(this);
	}

	[Symbol.for("nodejs.util.inspect.custom")](/*depth, inspectOptions, inspect*/) {
		return TExprStackItem.asString(this);
	}
}
