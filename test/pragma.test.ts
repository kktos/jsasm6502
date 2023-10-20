import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { readHexLine } from "../src/pragmas/data.pragma";
import { opts } from "./shared/options";

describe("Pragma", () => {
	beforeEach(() => {
		opts.output = "";
	});

	it("tests .hex on a single line", () => {
		const src = `
		.hex	02
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("02"));
	});

	it("tests .hex on a single line with comment", () => {
		const src = `
		.hex 020304; width
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("020304"));
	});

	it("tests .hex block with comment", () => {
		const src = `
		.hex ; a comment
			02 03 04 ; another comment
			; yet another comment
		.end
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("020304"));
	});

	it('tests .error "error" will display the err and stop', () => {
		const src = `
		.error "BOOM"
		.echo "should not be visible"
		`;

		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual("BOOM");
	});

	it("tests .fill 10", () => {
		const src = `
		.fill 10
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("00 00 00 00 00 00 00 00 00 00"),
		);
	});

	it("tests .ds 10, $AA", () => {
		const src = `
		.ds 10, $AA
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("AA AA AA AA AA AA AA AA AA AA"),
		);
	});
});
