import { describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { opts } from "./shared/options";
import { hexDump } from "../src/lib/helpers/utils";
import { readHexLine } from "../src/lib/pragmas/data.pragma";

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
			lda toto
			.dw toto
			toto
				rts

			lda #$60
			sta $1C
			sta here
			here= * + 1
			lda #00
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(hexDump(asmRes.obj.CODE)).toStrictEqual([
			"AD 05 10 05 10 60 A9 60 85 1C 8D 0E 10 A9 00"
		].join("\n"));
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
		expect(hexDump(asmRes.obj.CODE)).toStrictEqual("BD 00 10 10 04 C8 D0 F8 88 60");
	});

	it("should deal with local label with :", () => {
		const src = `
				.cpu "65C02"
		:		lda  $1000,x
				bpl  :+
				iny
				bne  :-
				bra next
				dey
		:		rts
		next
				nop
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(hexDump(asmRes.obj.CODE)).toStrictEqual("BD 00 10 10 06 C8 D0 F8 80 02 88 60 EA");
	});

	it("should find a global label from a namespace", () => {
		const src = `
			print
				sta $c00b
				rts

				.namespace tools
				lda #"A
				jsr print
				rts
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(hexDump(asmRes.obj.CODE)).toStrictEqual("8D 0B C0 60 A9 41 20 00 10 60");
	});

	it("should deal with label beforehand", () => {
		const src = `
			sta pixels
			iny
			lda ($1c),y
			sta pixels+1

			pixels=*+1

			lda $ffff
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(hexDump(asmRes.obj.CODE)).toStrictEqual([
			"8D 0A 10 C8 B1 1C 8D 0B 10 AD FF FF"
		].join("\n"));
	});


	it("should compute correctly the addresses", () => {
		opts.segments= {
			SPRITELIB: { start: 0xAE3D, end: 0xAEFF, size: 0x0200},
		};

		const src = `
		.cpu "65C02"
		.segment SPRITELIB
		// .org $AE00

		;spriteLo= $B600
		;spriteHi= $B680

/*
drawSprite: 	sty yPos
		tay
		lda spriteLo-1,y
		sta $1c
		lda spriteHi-1,y
		sta $1d

		ldy #$00
		sty LB3F7
		lda ($1c),y
		sta dsWidth
		sta dsWidthInit
		iny
		lda ($1c),y
		sta dsHeight
		stx dsHeightInit
		bpl Lae44

		inc LB3F7
		and #$7f
		sta dsHeight
		lda $B200,x
		bra :+
		; asl
		; clc
		; adc #$02
		; tay
		; lda ($1c),y
		; sta pixels
		; iny
		; lda ($1c),y
		; sta pixels+1
		; jmp loop

Lae44		lda $AF00,x
:
		asl
		clc
		adc #$02
		tay
		lda ($1c),y
*/

.org $AE3D

		sta pixels
		iny
		lda ($1c),y
		sta pixels+1


loop:		ldy $AEF0 ; yPos
		lda $1000,y
		sta $1c
		lda $2000,y
		sta $1d
		ldx $AEF3 ; dsHeightInit

		ldy $B3F7
		beq Lae73

		lda $B000,x
		jmp nextItem

Lae73
		lda $B100,x
nextItem
		tay

Lae77               cpy #40 ; $28
                    bcs Lae8e


pixels=*+1
                    lda $ffff
Lae8e
/*

	.org $AEF0

yPos       	.db $03
dsWidth 	.db $05
LB3F2       	.db $00
dsWidthInit 	.db $02
dsHeight 	.db $04
dsHeightInit 	.db $06
LB3F7        	.db $03
*/
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);

		// expect(asmRes.symbols).toStrictEqual(null);

		expect(hexDump(asmRes.obj.SPRITELIB,4,0xAE3D)).toStrictEqual(
			hexDump(readHexLine([
			// "8C F0 AE A8 B9 FF B5 85",
			// "1C B9 7F B6 85 1D A0 00",
			// "8C F6 AE B1 1C 8D F1 AE",
			// "8D F3 AE C8 B1 1C 8D F4",
			// "AE 8E F5 AE 10 0D EE F6",
			// "AE 29 7F 8D F4 AE BD 00",
			// "B2 80 03 BD 00 AF 0A 18",
			// "69 02 A8 B1 1C 8D 6A AE",


			"8D 6A AE",
			"C8",
			"B1 1C",
			"8D 6B AE",
			"AC F0 AE",
			"B9 00 10",
			"85 1C",
			"B9 00 20",
			"85 1D",
			"AE F3 AE",
			"AC F7 B3",
			"F0 06",
			"BD 00 B0",
			"4C 64 AE",
			"BD 00 B1",
			"A8",
			"C0 28",
			"B0 03",
			"AD FF FF",
			// "00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "00 00 00 00 00 00 00 00",
			// "03 05 00 02 04 06 03"
		].join("\n")),4,0xAE3D));
	});

	it("should be right on labels - bug 2", () => {

		opts.segments= { CODE: { start:0xD000, end: 0xd0FF, size:0x100} }
		const src = `

		.segment CODE
		.namespace unpack

run		sta hgrPage
		sty maxYpos

		lda utils.hgrHigh,x

hgrPage		.db 00
maxYpos		.db 00

		.end namespace

		.namespace utils
		hgrHigh=	$1111
		hgrLow=		$2222

		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(hexDump(asmRes.obj.CODE,4,0xD000)).toStrictEqual(hexDump(readHexLine([
			"8D 09 D0",
			"8C 0A D0",
			"BD 11 11",
			"00 00"
		].join("\n")),4,0xD000));
	});
});
