		.out ""
		.out "*************************************"
		.out "                REPEAT              "
		.out "*************************************"
		.out ""

;		.repeat len(spritesTable) spriteIdx
;
;		sprite= spritesTable[spriteIdx]
;		drawSprite sprite[0] sprite[1] sprite[2]
;		jsr Sa35e
;
;		.end


spriteIdx= 10

		.out ""
		.out "-1- repeat 3 times with iterator"
		.out ""

		.repeat 3 spriteIdx
			lda #spriteIdx
			sta $c030
		.end

		.out ""
		.out "-2- repeat 3 times no iterator"
		.out ""

		.repeat 3
			nop
		.end

		.out ""
		.out "-3- repeat (expr) times with iterator"
		.out ""

loopCount= 2
		.repeat loopCount
			lda #spriteIdx
			sta $c030
		.end