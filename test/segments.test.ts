import { beforeAll, describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { readHexLine } from "../src/pragmas/data.pragma";
import { opts } from "./shared/options";

describe("Segments", () => {

	beforeAll(() => {
		opts.segments= {
			BOOT: { start: 0x800, end: 0x8FF, size: 0x8FF-0x800+1},
			INTRO: { start: 0xA000, end: 0xBFFF, size: 0xBFFF-0xA000+1 }
		};
	});

	it("tests that the PC follows the start of a segment", () => {
		const src = `
		.segment boot
			lda info
			rts
		info
			.db $00

		.segment intro
			lda welcome
			rts
		welcome
			.db $00
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.BOOT).toStrictEqual(readHexLine("AD 04 08 60 00"));
		expect(asmRes.obj.INTRO).toStrictEqual(readHexLine("AD 04 A0 60 00"));
	});

	it("tests that ORG value is constraint by segment end", () => {
		const src = `
		.segment boot
			.org $F800
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual('ORG is out of Segment "BOOT" range 0800:08FF');
	});

	it("tests that ORG value is constraint by segment start", () => {
		const src = `
		.segment boot
			.org $400
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual('ORG is out of Segment "BOOT" range 0800:08FF');
	});

});
