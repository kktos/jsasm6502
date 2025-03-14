import { describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { readHexLine } from "../src/lib/pragmas/data.pragma";
import { opts } from "./shared/options";

describe("Function & Namespace", () => {

	it("tests a simple function with label in global too", () => {
		const src = `
		loop
			rts
	.function clearByte
			ldx #$30
			jsr $1000 ; getHGRLineAddr
			ldy #$27
			lda #$00
	loop	sta ($1c),y
			dey
			bpl loop
			rts
	.end function
			.db 00
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("60 A2 30 20 00 10 A0 27 A9 00 91 1C 88 10 FB 60 00")
			);
	});

	it("tests a call to a namespace from a function", () => {
		const src = `
			.namespace utils

			print
				rts

			.end namespace

			.function print
			jsr utils.print
			lda #<utils.print
			ldx #>utils.print
			.end
		`;
		const asmRes = assemble({name:"nsFromFn", content:src}, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("60 20 00 10 A9 00 A2 10")
			);

	});

	it("tests a C-like function", () => {
		const src = `
			.lst on

			toto = $41

			.function print {
				toto = $20
				ldx #toto
			}
				lda #toto
				jsr print

			.end
		`;
		const asmRes = assemble({name:"nsFromFn", content:src}, opts);

		// expect(asmRes).toStrictEqual("");

		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("A2 20 A9 41 20 00 10")
			);

	});
});
