import { describe, expect, it } from "vitest";

import { opts } from "./shared/options";
import { assemble } from "../src/lib/assembler";
import { readHexLine } from "../src/lib/pragmas/data.pragma";

describe("Comments", () => {

	it("tests comment with ;", () => {
		const src = `
			.db 0, 1 ; this is a comment
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("00 01"));
	});

	it("tests comment with //", () => {
		const src = `
			.db 0, 1 // this is a comment
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("00 01"));
	});

	it("tests multi lines comment with /* */", () => {
		const src = `
			.db 0, 1
			/* comment
			.db 2, 3
			.db 4, 5
			*/
			.db 6, 7
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("00 01 06 07"));
	});

	it("tests failure on unclosed multi lines comment", () => {
		const src = `
			.db 0, 1
			/* comment
			.db 2, 3
			.db 4, 5
			.db 6, 7
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual("Unclosed Comments");
	});

});
