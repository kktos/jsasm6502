import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { readHexLine } from "../src/lib/pragmas/data.pragma";
import { opts } from "./shared/options";

describe("Expression", () => {

	beforeEach(()=>{
		opts.output= "";
		opts.listing= true;
	});

	it("loads in Acc ascii of A", () => {
		const src = `
			lda #"A
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 41"));
	});

	it("loads in Acc ascii of A | $80 => $C1", () => {
		const src = `
			lda #"A|$80
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 C1"));
	});

	it("loads in Acc ascii of $C1 & $7F => $41", () => {
		const src = `
			lda #$C1 & $7f
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 41"));
	});

	it("loads in Acc ascii of %11001110 ^ $FF => $31", () => {
		const src = `
			lda #%11001110 ^ $FF
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
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
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("EA 60"));
	});

	it("tests boolean OR", () => {
		const src = `
			one=0
			two=1
			.if one || two
			nop
			.end
			rts
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("EA 60"));
	});

	it("tests boolean NOT", () => {
		const src = `
			one=0
			.if !one
			nop
			.end
			rts
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("EA 60"));
	});

	it("tests arithmetic addition and subtraction", () => {
		const src = `
			lda #10 + 5 - 3
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 0C"));
	});

	it("tests arithmetic multiplication and division", () => {
		const src = `
			lda #(10 * 5) / 2
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 19"));
	});

	it("tests arithmetic with parentheses for precedence", () => {
		const src = `
			lda #10 * (5 + 2)
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 46"));
	});

	it("tests unary negation", () => {
		const src = `
			value = -10
			lda #value
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 F6")); // -10 is $F6 in 8-bit 2's complement
	});

	it("tests modulo operator", () => {
		const src = `
			lda #10 % 3
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 01"));
	});

	it("tests bitwise shift left operator", () => {
		const src = `
			lda #1 << 4
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 10"));
	});

	it("tests bitwise shift right operator", () => {
		const src = `
			lda #$F0 >> 4
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 0F"));
	});

	it("tests MSB and LSB operators", () => {
		const src = `
			addr = $1234
			ldx #>addr
			ldy #<addr
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A2 12 A0 34"));
	});

});
