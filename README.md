# jsasm6502

6502/65C02 assembler in typescript

inspired by virtual assembler by mass:werk and the fact I needed to have it running locally ;)

## Expressions

```
; Number Arithmetic
; + - * /
count = 1+1
value = 6 * -1

; Strings
; + : concatenation
str = firstname + " " + lastname

; Number Comparisons
; < <= > >= = !=
.if value != 5

; String Comparisons
; = !=
.if str = "boom"

; Boolean logic
; !:not ||:or &&:and
.if !count || value=6

; Boolean arithmetic
; &:and |:or ^:xor
char = $41 | $80 ; $C1

; 16-bit address operations
; >:MSB <:LSB
lda #>$1232 ; $12
lda #<$1232 ; $32

```

## System Functions
```
; returns true if variable or label is defined
.if .def(printStr)

; returns true if variable or label is not defined
.if .undef(printStr)
printStr
	ldx #00
	; ...
.end

; returns the length of an array or a string
.if .len(spritesTable) > 2

; returns a string representing in hexa the parameter value 
.echo .hex(value)

; returns a string reprensting the type of the parameter value 
; it'll be : string | number | object | array
.if .type(val) = "string"

```

## System variables

System variables are readonly and they are prefixed by a dot "."
```
; get name of the current cpu opcodes
.cpu "6502"
.echo .cpu  ; => 6502
.cpu "65C02"
.echo .cpu  ; => 65C02

; get current namespace
.echo .namespace

; get current segment (name | start | end | size)
.echo .segment.name
.echo .segment.start
.echo .segment.end
.echo .segment.size

; get program counter (pc | *)
.echo .pc
.echo *

```

## Variable & Label

```
; define a simple variable
cout = $FDED

; define a complex variable with yaml or json
.define spritesTable
    - { id: 0xaa, x: 0xa0, y: 0x10}
    - { id: 0xbb, x: 0xb0, y: 0x20}
.end
lda #spritesTable[0].id
ldx #spritesTable[0].x
ldy #spritesTable[0].y
jsr drawSprite

;define a label (colon is optional)
loop:
	lda str, x
	beq exit
	jsr printChar
	dex
	bne loop
exit
    rts

; define local labels between label
!	lda str, x
	beq !+
	jsr printChar
	dex
	bne !-
!   rts

```

## Data declaration

```as
; bytes (8 bits)
.db $01, $02, $03 ; alias .byte

; words (16 bits) little-endian
.dw $0100, $0200, $0300 ; alias .word

; long (32 bits) little-endian
.dl $01020304, $AABBCCDD, $FFEE0022 ; alias .long

; long (32 bits) big-endian
.dbyte $01020304, $AABBCCDD, $FFEE0022

; long (32 bits) big-endian
.dword $01020304, $AABBCCDD, $FFEE0022

; fill n bytes with provided value or with $00
.ds 2,$AA ; alias .fill or .res 

; advance current PC to a multiple value and fill with provided value or with $00
.align 2,$AA

; bytes as hexa dump
.hex
    0E 60 0B 00 38 43 23 00 60 6F 0B 00 40 7F 02 00
    70 38 07 00 00 60 07 00 00 60 06 00 00 50 0A 00
    00 58 1E 00 00 3E 0E 00 00 1E 1E 00 00 3C 3C 00
.end
```

## String declaration

```as
; string
.text "one", "two", "three"

; C string : null-terminated string
.cstr "one", "two" ; alias .cstring or .asciiz

; pascal string : string prefixed with a byte holding its length
.pstr "one", "two" ; alias .pstring

; long pascal string : string prefixed with a word(little-endian) holding its length
.pstrl "one", "two" ; alias .pstringl

```

## Control Flow

```as
; conditional assembly
.if .len(str)>10
    .warning "str is too long !"
.end

; loop n times
.repeat 2
    nop
.end
.repeat 2 idx
    lda #charList[idx]
	jsr printChar
.end

; loop on array
.for colour of colours ; colours = [ "red", "green", "blue" ]
    .echo colour
.end
```

## Namespaces

The source files could be organised in namespaces in order to keep their variable declarations internal.  
The default namespace is "GLOBAL".  
When a variable or a label is declared inside a namespace, it won't be "visible" from other namespaces.  
To make a variable or a label visible everywhere, just defined it in "GLOBAL" or export it.
```
; declaration of a namespace
.namespace loader
    count = 5
.end namespace

; to use the default namespace
.namespace

; to export a variable or label to "GLOBAL"
.namespace loader
    .export count
    count = 5
.end namespace

lda #count

; to access a variable or label not exported
.namespace loader
    count = 5
.end namespace

lda #loader.count
```

Namespaces can be nested and they use a stack for this
```
; here, we're in global
.namespace loader
	; here, we're in loader
    count = 5

	.namespace boot
	    ; here, we're in boot

		.namespace
			; here, we're in global
		.end namespace

    	; here, we're back in boot

	.end namespace

    ; here, we're back in loader

.end namespace

; here, we're back in global
```

## Memory

Memory can be segmented in part and you can set your code to be assembled for a specific part.  
This will allow you, for instance, to control whether your code can fit in a segment.  
To set up segments, you will need a yaml conf file with an entry segments with hold the map of your segments.  
For each segment, you have to define the starting and ending addresses. And optionally, a padding value to fill the unused space (default is $00).
```yaml
# main.conf
segments:
  BOOT1:		{ start: 0x0800, end: 0x08FF }
  LOADER:		{ start: 0xB700, end: 0xBFFF, pad: 0xFF }
```

```
; use a segment
.segment loader
; here the program counter has be set to $B700, start of the loader segment
```

You can set the program counter, but with addresses in the range defined by the current segment.
```
; set the program counter
.org $B780
* = $B780
; as we're in the loader segment, the addresses range is $B700 to $B7FF. Org values ouside that range will raise an error.
```

## Macro

```
; create a macro with a name and parameter(s)
	.macro printStr str
		ldx #<str
		ldy #>str
		jsr printStr
	.end

    printStr welcome
    rts
welcome
    .cstr "Welcome !"

; you can capture all the parameters using the rest notation
	.macro defStruc id, ...parms
		.dw id
		.repeat .len(parms) idx
		    .dw parms[idx]
		.end
	.end
	defStruc $CAFE, "ABCD", $1234

```

## Comments

You can add a comment on any line with the semicolon, ";", as usual for assembler.  
But if you are more into C-like comments, you can use instead the double slash "//".  
And if you cant to comment a whole section, you can use C-like the /* .... */.

```
; this is a comment

    printStr welcome ; this is another comment
    rts

welcome
    .cstr "Welcome !"

// and here you can comment out a section

/*
.for colour of colours ; colours = [ "red", "green", "blue" ]
    .echo colour
.end
*/

```

## Miscellaneous

```
; tell the assembler which set if opcodes it has to use
; 6502, 65X02, 65C02
.cpu 6502 ; alias .setcup or .processor

; use a specific characters map for string declaration
.option charmap apple2
/*
 for instance, the ascii code for the uppercase letter A is $41.
 but to render it on an apple2, it needs to be $C1.
 you can have a characters map which will redefine $41 to $C1
 so the following
 .text "ABC"
 will emit :
 $C1 $C2 $C3
*/

; enable or disable the printing of the dissasembly of your code
.list on ; alias .listing or .lst
.list off
```

```
; user print to the listing
.log "count=", count ; alias .echo or .out

; user print of warning to the listing
.warning "missing value for loader"

; user print of error to the listing
.error "missing value for loader"
```

```
; include a source file
.include "./boot/loader.asm"

; include a binary file as .db
.include "./boot/logo.img" asBin
```
