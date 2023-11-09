import { describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { readHexLine } from "../src/lib/pragmas/data.pragma";
import { opts } from "./shared/options";

describe("Expression", () => {
	it("loads in Acc ascii of A", () => {
		const src = `
			lda #"A
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 41"));
	});

	it("loads in Acc ascii of A | $80 => $C1", () => {
		const src = `
			lda #"A|$80
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 C1"));
	});

	it("loads in Acc ascii of $C1 & $7F => $41", () => {
		const src = `
			lda #$C1 & $7f
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 41"));
	});

	it("loads in Acc ascii of %11001110 ^ $FF => $31", () => {
		const src = `
			lda #%11001110 ^ $FF
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 31"));
	});

	it("tests boolean AND", () => {
		const src = `
			one=1
			two=1
			.if one && two
			nop
			.end
			rts
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("EA 60"));
	});
});
