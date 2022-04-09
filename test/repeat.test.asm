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


		.out ""
		.out "-1- define spriteIdx = 10"
		.out ""

spriteIdx= 10
.out spriteIdx

		.out ""
		.out "-2- repeat 3 times with iterator spriteIdx (should be equal to 0,1,2)"
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
		.out "-3- repeat (loopCount) times - use var spriteIdx: should be equal to 10"
		.out ""

loopCount= 2
		.repeat loopCount
			lda #spriteIdx
			sta $c030
		.end