import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { readHexLine } from "../src/pragmas/data.pragma";
import { opts } from "./shared/options";

describe("Define", () => {
	beforeEach(() => {
		opts.output= "";
	});

	it("tests define var", () => {
		const src = `
		.define var_yaml
			- one
			- two
		.end
		.log var_yaml
		`;
		assemble(src, opts);
		expect(opts.output.trim()).toStrictEqual('["one","two"]');
	});

	it("tests define array", () => {
		const src = `
		.define var_yaml
		prop: !!seq
		- Mercury   # Rotates - no light/dark sides.
		- Venus     # Deadliest. Aptly named.
		- Earth     # Mostly dirt.
		- Mars      # Seems empty.
		- Jupiter   # The king.
		- Saturn    # Pretty.
		- Uranus    # Where the sun hardly shines.
		- Neptune   # Boring. No rings.
		- Pluto     # You call this a planet?
		.end
		.log .type(var_yaml.prop), .len(var_yaml.prop)
		`;
		assemble(src, opts);
		expect(opts.output.trim()).toStrictEqual("array9");
	});

	it("tests define array of object with $hexa", () => {
		const src = `

		.define spritesTable
		- { id: $AA, x: $A0, y: $10}
		- { id: $bb, x: $b0, y: $20}
		.end

		.log spritesTable

		.repeat .len(spritesTable) spriteIdx

			; sprite = spritesTable[spriteIdx]
			ldx #spritesTable[spriteIdx].x
			ldy #spritesTable[spriteIdx].y
			lda #spritesTable[spriteIdx].id
			jsr $1000

		.end
		`;
		const asmRes = assemble(src, opts);
		expect(opts.output.trim()).toStrictEqual('[{"id":170,"x":160,"y":16},{"id":187,"x":176,"y":32}]');
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine(
				`
				A2 A0 A0 10 A9 AA 20 00 10
				A2 B0 A0 20 A9 BB 20 00 10
				`,
			),
		);
	});

	it("tests define array of object", () => {
		const src = `
		.define spritesTable
		- { id: 0xaa, x: 0xa0, y: 0x10}
		- { id: 0xbb, x: 0xb0, y: 0x20}
		.end

		spriteIdx= 0

		.log .type(spritesTable[spriteIdx])

		sprite= spritesTable[spriteIdx]

		lda #sprite.x

		`;
		const asmRes = assemble(src, opts);
		expect(opts.output.trim()).toStrictEqual("object");
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine(
				`
				A9 A0
				`,
			),
		);
	});

	it("should throw an error on duplicate define", () => {
		const src = `
		.define spritesTable
		- { id: 0xaa, x: 0xa0, y: 0x10}
		- { id: 0xbb, x: 0xb0, y: 0x20}
		.end
		.define spritesTable
		- { id: 0xaa, x: 0xa0, y: 0x10}
		- { id: 0xbb, x: 0xb0, y: 0x20}
		.end
		`;
		let asmRes;
		expect(() => asmRes === assemble(src, opts)).toThrowError("Duplicate Symbol : SPRITESTABLE");
	});

});
