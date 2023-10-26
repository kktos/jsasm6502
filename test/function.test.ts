import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { readHexLine } from "../src/pragmas/data.pragma";
import { opts } from "./shared/options";

describe("Function", () => {

	it("tests a simple function", () => {
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
		expect(asmRes.error).toBeNull();
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("60 A2 30 20 00 10 A0 27 A9 00 91 1C 88 10 FB 60 00")
			);
	});

	it("tests access to external label from a function", () => {
		const src = `
		counter
			.db 00
		.function clearByte2
			lda counter
		.end function
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.error).toBeNull();
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("00 AD 00 10")
			);
	});

	it("tests we can't access a label in a function", () => {
		const src = `
		.function clearByte3
		counter
			.db 00
		.end function
			lda counter
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.error).toStrictEqual([
			'IDENTIFIER : Unknown identifier "COUNTER" in GLOBAL',
			// 'But "COUNTER" exists in CLEARBYTE',
		].join("\n"));
	});

	it("tests we can't access a function label", () => {
		const src = `
		.namespace screen
		.function clear
		counter
			.db 00
			lda counter
		.end function
			lda clear.counter
		.end namespace
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.error).toStrictEqual([
			"IDENTIFIER : Labels inside a function can't be access",
		].join("\n"));
	});

	it("tests a function call", () => {
		const src = `
			jmp start
		.function print
			rts
		.end
		.end
		start
			jsr print
			rts
		`;
		const asmRes = assemble({content:src}, opts);
		expect(asmRes.error).toStrictEqual('IDENTIFIER : Unknown identifier "START" in GLOBAL');

	});


});
