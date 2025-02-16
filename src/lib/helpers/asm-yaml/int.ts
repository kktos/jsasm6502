import { Type } from "js-yaml";

function isHexCode(c: number) {
	return (
		(0x30 /* 0 */ <= c && c <= 0x39) /* 9 */ ||
		(0x41 /* A */ <= c && c <= 0x46) /* F */ ||
		(0x61 /* a */ <= c && c <= 0x66) /* f */
	);
}

function isOctCode(c: number) {
	return 0x30 /* 0 */ <= c && c <= 0x37 /* 7 */;
}

function isDecCode(c: number) {
	return 0x30 /* 0 */ <= c && c <= 0x39 /* 9 */;
}

function resolveYamlInteger(data: string | null) {
	if (data === null) return false;

	const max = data.length;
	let index = 0;
	let hasDigits = false;
	let ch: string;

	if (!max) return false;

	ch = data[index];

	// sign
	if (ch === "-" || ch === "+") {
		ch = data[++index];
	}

	if (ch === "$") {
		// console.log("hexa");

		// base 16
		index++;

		for (; index < max; index++) {
			ch = data[index];
			if (ch === "_") continue;
			if (!isHexCode(data.charCodeAt(index))) return false;
			hasDigits = true;
		}
		return hasDigits && ch !== "_";
	}

	if (ch === "0") {
		// 0
		if (index + 1 === max) return true;
		ch = data[++index];

		// base 2, base 8, base 16

		if (ch === "b") {
			// base 2
			index++;

			for (; index < max; index++) {
				ch = data[index];
				if (ch === "_") continue;
				if (ch !== "0" && ch !== "1") return false;
				hasDigits = true;
			}
			return hasDigits && ch !== "_";
		}

		if (ch === "x") {
			// base 16
			index++;

			for (; index < max; index++) {
				ch = data[index];
				if (ch === "_") continue;
				if (!isHexCode(data.charCodeAt(index))) return false;
				hasDigits = true;
			}
			return hasDigits && ch !== "_";
		}

		if (ch === "o") {
			// base 8
			index++;

			for (; index < max; index++) {
				ch = data[index];
				if (ch === "_") continue;
				if (!isOctCode(data.charCodeAt(index))) return false;
				hasDigits = true;
			}
			return hasDigits && ch !== "_";
		}
	}

	// base 10 (except 0)

	// value should not start with `_`;
	if (ch === "_") return false;

	for (; index < max; index++) {
		ch = data[index];
		if (ch === "_") continue;
		if (!isDecCode(data.charCodeAt(index))) {
			return false;
		}
		hasDigits = true;
	}

	// Should have digits and should not end with `_`
	if (!hasDigits || ch === "_") return false;

	return true;
}

function constructYamlInteger(data: string) {
	let value = data;
	let sign = 1;
	let ch: string;

	if (value.indexOf("_") !== -1) {
		value = value.replace(/_/g, "");
	}

	ch = value[0];

	if (ch === "-" || ch === "+") {
		if (ch === "-") sign = -1;
		value = value.slice(1);
		ch = value[0];
	}

	if (value === "0") return 0;

	if (ch === "$") {
		return sign * Number.parseInt(value.slice(1), 16);
	}

	if (ch === "0") {
		if (value[1] === "b") return sign * Number.parseInt(value.slice(2), 2);
		if (value[1] === "x") return sign * Number.parseInt(value.slice(2), 16);
		if (value[1] === "o") return sign * Number.parseInt(value.slice(2), 8);
	}

	return sign * Number.parseInt(value, 10);
}

function isInteger(data: object) {
	return (
		Object.prototype.toString.call(data) === "[object Number]" &&
		(data as unknown as number) % 1 === 0 &&
		!isNegativeZero(data as unknown as number)
	);
}

function isNegativeZero(number: number) {
	return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
}

export const intType = new Type("tag:yaml.org,2002:int", {
	kind: "scalar",
	resolve: resolveYamlInteger,
	construct: constructYamlInteger,
	predicate: isInteger,
	represent: {
		binary: (obj: object) =>
			(obj as unknown as number) >= 0
				? `0b${(obj as unknown as number).toString(2)}`
				: `-0b${(obj as unknown as number).toString(2).slice(1)}`,
		octal: (obj: object) =>
			(obj as unknown as number) >= 0
				? `0o${(obj as unknown as number).toString(8)}`
				: `-0o${(obj as unknown as number).toString(8).slice(1)}`,
		decimal: (obj: object) => (obj as unknown as number).toString(10),
		/* eslint-disable max-len */
		hexadecimal: (obj: object) =>
			(obj as unknown as number) >= 0
				? `0x${(obj as unknown as number).toString(16).toUpperCase()}`
				: `-0x${(obj as unknown as number).toString(16).toUpperCase().slice(1)}`,
	},
	defaultStyle: "hexadecimal",
	styleAliases: {
		binary: [2, "bin"],
		octal: [8, "oct"],
		decimal: [10, "dec"],
		hexadecimal: [16, "hex"],
	},
});
