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
/*
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

	it("tests to redefine a segment", () => {
		const src = `
			.segment intro {}
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual("SEGMENT: segment already defined");
	});

	it("tests to define a segment with missing fields", () => {
		const src = `
			.segment newOne { start: $1000 }
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual("SEGMENT: Invalid segment definition");
	});

	it("tests to define a segment with unknown fields", () => {
		const src = `
			.segment newOne {
				start: $1000,
				end: $1100,
				test: "false"
			}
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual("SEGMENT: Invalid segment definition");
	});

	it("tests to define a segment", () => {
		const src = `
			.segment newOne {
				start: $800,
				end: $8FF
			}
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.segments.NEWONE).toStrictEqual({
			"end": 0x8FF,
			"size": 256,
			"start": 0x800
		  });
	});
*/
	it("tests to define a segment", () => {
		const src = ".segment newSegment { start: 0x800, toto: 0, end: $8FF, pad: $FF }";
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.segments.NEWSEGMENT).toStrictEqual({
			end: 0x8FF,
			size: 256,
			start: 0x800,
			pad: 0xFF
		  });
	});

	it("tests to define a segment", () => {
		const src = ".segment newSegment { start: 0x800, toto: 0, pad: $FF }";
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual('SEGMENT: Invalid segment definition : CONF.string: Missing required key "end"');
	});

});
