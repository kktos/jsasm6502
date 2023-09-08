import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler.js";
import { readHexLine } from "../src/pragmas/data.pragma.js";

let output = "";

const opts = {
	readFile: (filename, fromFile, asBin) => {
		return { path: "", content: filename };
	},
	YAMLparse: () => "",
	listing: false,
	segments: null,
	console: {
		log: (s) => {
			output += `${s}\n`;
		},
		error: (s) => {
			output += `${s}\n`;
		},
		warn: (s) => {
			output += `${s}\n`;
		},
	},
};

describe("Data", () => {
	it("tests .db", () => {
		const src = `
			.db 0, 1
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("00 01"));
	});

	it("tests .byte", () => {
		const src = `
			.byte $10, $20
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("10 20"));
	});

	it("tests .dw", () => {
		const src = `
			.dw 5, 1
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("05 00 01 00"));
	});

	it("tests .word", () => {
		const src = `
			.word $10, $20
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("10 00 20 00"));
	});

	it("tests .dl", () => {
		const src = `
			.dl 4, 1
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("04 00 00 00 01 00 00 00"),
		);
	});

	it("tests .long", () => {
		const src = `
			.long $10, $20
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("10 00 00 00 20 00 00 00"),
		);
	});

	it("tests .dbyte", () => {
		const src = `
			.dbyte $10, $20
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("00 10 00 20"));
	});

	it("tests .dword", () => {
		const src = `
			.dword $10, $20
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("00 00 00 10 00 00 00 20"),
		);
	});
});
