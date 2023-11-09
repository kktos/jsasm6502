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
			return null; //throw new VAParseError(`Unknown data type : ${typeof value}`);
	}
}

export function hexDump(bytes: unknown[], bytesCountPerLine = 16, offset = -1) {
	let output = "";
	let counter = 0;

	if (!Array.isArray(bytes)) {
		throw new VAParseError(`hexDump: need an array: ${typeof bytes}`);
	}

	let line = "";
	for (const byte of bytes as number[]) {
		line += `${(byte ?? 0).toString(16).padStart(2, "0")} `;
		counter++;
		if (counter % bytesCountPerLine === 0) {
			if (offset >= 0) output += `${(offset + counter - bytesCountPerLine).toString(16).padStart(4, "0")} : `;
			output += `${line.trim()}\n`;
			line = "";
		}
	}
	if (line !== "") {
		if (offset >= 0) output += `${(offset + counter - bytesCountPerLine).toString(16).padStart(4, "0")} : `;
		output += `${line.trim()}\n`;
	}
	return output.toUpperCase().trim();
}
