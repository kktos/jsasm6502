import { TOKEN_TYPES } from "../lexer/token.class";
import { VAParseError } from "./errors.class";

export function getHexByte(val: number) {
	return val.toString(16).toUpperCase().padStart(2, "0");
}

export function getHexWord(val: number) {
	return val.toString(16).toUpperCase().padStart(4, "0");
}

export function high(val: number) {
	return (val >> 8) & 0xff;
}

export function low(val: number) {
	return val & 0xff;
}

export function getValueType(value: unknown) {
	switch (typeof value) {
		case "number":
			return TOKEN_TYPES.NUMBER;
		case "string":
			return TOKEN_TYPES.STRING;
		case "object":
			return Array.isArray(value) ? TOKEN_TYPES.ARRAY : TOKEN_TYPES.OBJECT;
		default:
			throw new VAParseError(`Unknown data type : ${typeof value}`);
	}
}
