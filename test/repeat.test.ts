import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { readHexLine } from "../src/pragmas/data.pragma";
import { beforeEach } from "node:test";
import { opts } from "./shared/options";

describe("REPEAT PRAGMA", () => {
	beforeEach(() => {
		opts.output = "";
	});

	it("check repeat count", () => {
		const src = `
		.repeat 3
			nop
		.end
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine(
				`
				EA EA EA
				`,
			),
		);
	});

	it("check repeat count and iterator", () => {
		const src = `
		; define a dummy label to check name colision
		spriteIdx= 10
		loopCount= 3

		; here, the iterator name is the same
		.repeat loopCount spriteIdx
			lda #loopCount-spriteIdx
			sta $c030
		.end

		; here we should use the label value
		lda #spriteIdx
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine(
				`
				A9 03 8D 30 C0
				A9 02 8D 30 C0
				A9 01 8D 30 C0
				A9 0A
				`,
			),
		);
	});

	it("check repeat with external label", () => {
		const src = `
		spriteIdx= 10
		loopCount= 2
		.repeat loopCount
			lda #spriteIdx
			sta $c030
		.end
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine(
				`
				A9 0A 8D 30 C0
				A9 0A 8D 30 C0
				`,
			),
		);
	});

	it("check repeat with internal label", () => {
		const src = `
		loopCount= 2
		.repeat loopCount idx
			spriteIdx= 10
			lda #spriteIdx-idx
			sta $c030
		.end
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine(
				`
				A9 0A 8D 30 C0
				A9 09 8D 30 C0
				`,
			),
		);
	});

	it("check repeat on array items", () => {
		const src = `
		.define spritesTable
		- { id: 0xaa, x: 0xa0, y: 0x10}
		- { id: 0xbb, x: 0xb0, y: 0x20}
		.end

		.repeat .len(spritesTable) spriteIdx

			sprite= spritesTable[spriteIdx]

			lda #sprite.id
			sta $c030
		.end
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine(
				`
				A9 AA 8D 30 C0
				A9 BB 8D 30 C0
				`,
			),
		);
	});
});
