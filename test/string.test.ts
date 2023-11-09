import { describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { readHexLine } from "../src/lib/pragmas/data.pragma";
import { opts } from "./shared/options";

describe("Strings", () => {
	it("tests .text with a string", () => {
		const src = `
			.text "ABCD"
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("41 42 43 44"));
	});

	it("tests .text without string", () => {
		const err = "STRING: missing a string here";
		const src = `
			.text
			.text "abcd"
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(err);
	});

	it("tests .text with many strings", () => {
		const src = `
			.text "AB","CD"
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("41 42 43 44"));
	});

	it("tests .cstr with many strings", () => {
		const src = `
			.cstr "AB","CD"
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("41 42 00 43 44 00"));
	});

	it("tests .pstr with many strings", () => {
		const src = `
			.pstr "ABCD","ABCD"
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("04 41 42 43 44 04 41 42 43 44"),
		);
	});

	it("tests .pstrl with many strings", () => {
		const src = `
			.pstrl "ABCD","ABCD"
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("04 00 41 42 43 44 04 00 41 42 43 44"),
		);
	});

});
