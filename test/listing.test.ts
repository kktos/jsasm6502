import { describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { hexDump } from "../src/lib/helpers/utils";
import { readHexLine } from "../src/lib/pragmas/data.pragma";
import { opts } from "./shared/options";

describe("Listing", () => {

	it("tests that no listing is generated when listing is OFF", () => {

		const src = [
			"test:",
			"			lda #$10",
			"			rts"
		].join("\n");

		opts.listing= false;

		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);

		const disasm= [""];
		const out= asmRes.disasm[0].content;
		expect(out).toStrictEqual(disasm.join("\n"));
	});

	it("tests that listing is generated when listing is ON", () => {

		const src = [
			"test:",
			"			lda #$10",
			"			rts"
		].join("\n");

		opts.listing= true;

		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);

		const disasm= [
		   "                                  test:",
		   "1000:  A9 10                      			lda #$10",
		   "1002:  60                         			rts",
		   ""
		];
		expect(asmRes.disasm[0].name).toStrictEqual(null);
		expect(asmRes.disasm[0].content).toStrictEqual(disasm.join("\n"));
	});

	it("tests listing in a file", () => {

		const srcMain = [
			"			lda #$10",
			"			rts",
			"			.include 'test.asm'",
		].join("\n");

		const srcIncluded = [
			".LIST FILE .filename  + '.lst'",
			"test:",
			"			lda #$10",
			"			rts"
		].join("\n");


		opts.readFile= (filename: string, fromFile?: string, asBin?: boolean) => {
			const rez = { path: "", dir: "", content: filename, error:"" };
			switch(filename) {
				case "main.asm":
					rez.content= srcMain;
					break;
				case "test.asm":
					rez.content= srcIncluded;
					break;
			}
			return rez;
		};

		opts.listing= true;

		const asmRes = assemble("main.asm", opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);

		// expect(asmRes.disasm).toBe(null);
		expect(asmRes.disasm).toHaveLength(2);
		expect(asmRes.disasm[0].name).toStrictEqual(null);
		expect(asmRes.disasm[1].name).toStrictEqual("test.asm.lst");

		const testDisasm= [
			"                                  .LIST FILE .filename  + '.lst'",
			"                                  test:",
			"1003:  A9 10                      			lda #$10",
			"1005:  60                         			rts",
			""
		 ];

		expect(asmRes.disasm[1].content).toStrictEqual(testDisasm.join("\n"));
	});
});
