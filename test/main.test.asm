		.setcpu "65c02"


		.segment boot

		* = $800
		
		.namespace boot
		; .export "^ta"

		.lst on
toto=$44

@loop
		; .include "include.test.asm"

		;  .include "repeat.test.asm"

		.define spritesTable
		- { id: 0x55, x: 0, y: 0}
		- { id: 0x27, x: 0, y: 0}
		.end

		.define spritesTable0
		{ obj: [{id: 0x55, x: 0, y: 0}] }
		.end

		lda #spritesTable0.obj[0].id

		.if 1
		.repeat .len(spritesTable) spriteIdx
			ldx #spritesTable[spriteIdx].x
			ldy #spritesTable[spriteIdx].y
			lda #spritesTable[spriteIdx].id
			; jsr spritelib.drawSprite			
			; jsr Sa35e
		.end
		.end

		lda $2000
		.if 1
			.if 1
				; sta tata
				lda toto
			.end
		lda $20
		lda $2000
		.end

		rts
		.end


		inx

		bne @loop

tata
@loop:	lda $C000
		bpl @loop
		lda #0
		inx
		rts

		.namespace global

		lda tata


		inx
toto	lda #20
		lda $20
		lda $2000
		bne toto
		beq titi
		rts
titi:
		ldx #55
		rts

		.end

		lda #$FF

;		.include "include.test.asm"
;		.include "variable.test.asm"
;		.include "macro.test.asm"
;		.include "repeat.test.asm"
;		.include "function.test.asm"
