import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { readHexLine } from "../src/lib/pragmas/data.pragma";
import { opts } from "./shared/options";
import { hexDump } from "../src/lib/helpers/utils";

describe("Segments", () => {

	beforeEach(() => {
		opts.segments= {
			BOOT: { start: 0x800, end: 0x8FF, size: 0x8FF-0x800+1},
			INTRO: { start: 0xA000, end: 0xBFFF, size: 0xBFFF-0xA000+1 }
		};
	});

	it("tests with default segment", () => {
		opts.segments= null;

		const src = `
			lda toto
			.dw toto
			toto
				rts
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(hexDump(asmRes.obj.CODE)).toStrictEqual("AD 05 10 05 10 60");
	});

	it("tests that the PC follows the start of a segment", () => {
		const src = `

		.segment boot
			lda toto
			.dw toto
			toto
				rts

		.segment intro
			lda welcome
			rts
		welcome
			.db $00
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(hexDump(asmRes.obj.BOOT)).toStrictEqual("AD 05 08 05 08 60");
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
