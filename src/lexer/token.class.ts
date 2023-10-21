import { TValue, TValueType } from "../types/Value";

export const TOKEN_TYPES = {
	DOT: 0x100,
	HASH: 0x101,
	LEFT_PARENT: 0x102,
	RIGHT_PARENT: 0x103,
	COMMA: 0x104,
	COLON: 0x105,
	BANG: 0x106,
	AT: 0x107,
	LEFT_BRACKET: 0x108,
	RIGHT_BRACKET: 0x109,

	DOLLAR: 0x150,
	PERCENT: 0x151,

	IDENTIFIER: 0x200,
	NUMBER: 0x300,
	STRING: 0x400,

	ARRAY: 0x501,
	OBJECT: 0x502,
	REST: 0x503,

	// COMMENT: 0x500,

	LOWER: 0x600,
	GREATER: 0x601,
	EQUAL: 0x602,
	STAR: 0x603,
	SLASH: 0x604,
	PLUS: 0x605,
	MINUS: 0x606,

	AND: 0x607,
	OR: 0x608,

	BAND: 0x609,
	BOR: 0x60a,
	BXOR: 0x60b,

	INVALID: 0xfff,

	EOF: 0x8000,
};
export const TOKEN_TYPES_ENTRIES = Object.entries(TOKEN_TYPES);
type TTOKEN_TYPES = keyof typeof TOKEN_TYPES;

export class Token implements TValue {
	public type: number | null;
	public value: TValueType = null;
	public text = "";
	public posInLine = 0;
	public hasSpaceBefore = false;

	constructor(ttype = null) {
		this.type = ttype;
	}

	get asString() {
		return this.value as string;
	}

	get asNumber() {
		return this.value as number;
	}

	toString() {
		const ttype = this.type ? getTypeName(this.type) : "????";
		return `Token <${this.posInLine}:${ttype}${this.value != null ? ` = ${this.value}` : ""} - '${this.text}'>`;
	}

	[Symbol.for("nodejs.util.inspect.custom")](/*depth, inspectOptions, inspect*/) {
		return this.toString();
	}
}

export function getTypeName(type: number) {
	const t = TOKEN_TYPES_ENTRIES.find(([k, v]) => v === type);
	return t?.[0] ?? "????";
}

export function tokenTypeOf(value: unknown) {
	switch (typeof value) {
		case "number":
			return TOKEN_TYPES.NUMBER;
		case "string":
			return TOKEN_TYPES.STRING;
		case "boolean":
			return TOKEN_TYPES.NUMBER;
		case "object":
			if (Array.isArray(value)) return TOKEN_TYPES.ARRAY;
			return TOKEN_TYPES.OBJECT;
		default:
			return null;
	}
}
