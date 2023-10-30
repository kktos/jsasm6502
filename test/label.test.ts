import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { opts } from "./shared/options";
import { readHexLine } from "../src/pragmas/data.pragma";

describe("Label", () => {

	it("should detect duplicate labels", () => {
		const src = `
			lda #0
			beq exit
			ldx #3
		exit
			ldy #0
		exit
			rts
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual([
			'Duplicate Label : "GLOBAL.EXIT"',
			'Defined in "":5',
			'',
		].join("\n"));
	});

	it("should deal with label beforehand", () => {
		const src = `
			.dw toto
			toto
				rts
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("02 10 60"));
	});

	it("should deal with local label with !", () => {
		const src = `
		!		lda  $1000,x
				bpl  !+
				iny
				bne  !-
				dey
		!		rts

		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("BD 00 10 10 04 C8 D0 F8 88 60"));
	});

	it("should deal with local label with :", () => {
		const src = `
		:		lda  $1000,x
				bpl  :+
				iny
				bne  :-
				dey
		:		rts
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("BD 00 10 10 04 C8 D0 F8 88 60"));
	});

});
