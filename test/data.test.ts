import { describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { readHexLine } from "../src/lib/pragmas/data.pragma";
import { opts } from "./shared/options";

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

	it("tests .db with more than 1 char string fails", () => {
		const src = `
			.db "ap" | $80
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual("BOR: Only Numbers are allowed here");
	});

	it("tests .db with 1 char string BOR", () => {
		const src = `
			.db "A"
			.db "A" | $80
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("41 C1"));
	});

});
