import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { readHexLine } from "../src/pragmas/data.pragma";
import { opts } from "./shared/options";

describe("Define", () => {
	beforeEach(() => {
		opts.output= "";
		opts.listing= true;
	});

	it.skip("tests define var", () => {
		const src = `
		.define var_yaml
			- one
			- two
		.end
		.log var_yaml
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual('["one","two"]');
	});

	it.skip("tests define array", () => {
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
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("array9");
	});

	it.skip("tests define array of object with $hexa", () => {
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
		expect(asmRes.error).toStrictEqual(null);
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

	it.skip("tests define array of object", () => {
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
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("object");
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine(
				`
				A9 A0
				`,
			),
		);
	});

	it.skip("should throw an error on duplicate define", () => {
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
		const asmRes = assemble(src, opts);
		expect(asmRes.error).toStrictEqual("Duplicate Symbol : SPRITESTABLE");
	});

	it("should define an array", () => {
		const src = `
		.macro drawSprite id,x,y
			ldx #x
			ldy #y
			lda #id
			jsr $1000
		.end

		.function displayHelpObj

		.define spritesTable
		- { id: $55, x: $0d, y: $30, name:"text key"}
		- { id: $27, x: 15, y: 60, name:"img key"}
		.end

		.for sprite of spritesTable
		  drawSprite sprite.id, sprite.x, sprite.y
		  jsr $2000
		.end

		.end

		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine(
				`
				A2 0D A0 30 A9 55 20 00 10 20 00 20
				A2 0F A0 3C A9 27 20 00 10 20 00 20
				`,
			),
		);
	});

});
