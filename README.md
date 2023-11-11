# jsasm6502

6502/65C02 assembler in typescript

inspired by virtual assembler by mass:werk and the fact I needed to have it running locally ;)

## Expressions

```as
// Number Arithmetic
// + - * /
count = 1+1
value = 6 * -1

// Strings
// + : concatenation
str = firstname + " " + lastname

// Number Comparisons
// < <= > >= = !=
.if value != 5

// String Comparisons
// = !=
.if str = "boom"

// Boolean logic
// !:not ||:or &&:and
.if !count || value=6 && withKey=1

// Boolean arithmetic
// &:and |:or ^:xor
char = $41 | $80 ; $C1

// 16-bit address operations
// >:MSB <:LSB
lda #>$1232 ; $12
lda #<$1232 ; $32

```

## System Functions
#### .def( < value or variable/label name > )
```as
// returns true if value is defined
.if .def(printStr)
// returns true if the label is defined
.if .def("printStr") && .def("utils.getKey")
```
#### .undef( < value or variable/label name > )
```as
// returns true if value is not defined
.if .undef(printStr)
printStr
	ldx #00
	; ...
.end
```
#### .len( < value as array or string > )
```as
// returns the length of an array or a string
.if .len(spritesTable) > 2
```
#### .hex( < value > )
```as
// returns a string representing in hexa the parameter value 
.echo .hex(count)
```
#### .type( < value > )
```as
// returns a string representing the type of the parameter value 
// it'll be : string | number | object | array
.if .type(val) = "string"
```

## System variables

System variables are readonly and they are prefixed by a dot "."
#### .cpu
```as
// get name of the current cpu opcodes
.cpu "6502"
.echo .cpu  ; => 6502
.cpu "65C02"
.echo .cpu  ; => 65C02
```
#### .namespace
```as
// get current namespace
.echo .namespace
```
#### .segment
```as
// get current segment (name | start | end | size)
.echo .segment.name
.echo .segment.start
.echo .segment.end
.echo .segment.size
```
#### .pc or *
```as
// get program counter (pc | *)
.echo .pc
.echo *

```

## Variable & Label
#### < name > = expression
```as
// define a simple variable
cout = $FDED
```
#### .define < name >
```as
// define a complex variable with yaml or json
.define spritesTable
    - { id: 0xaa, x: 0xa0, y: 0x10}
    - { id: 0xbb, x: 0xb0, y: 0x20}
.end
lda #spritesTable[0].id
ldx #spritesTable[0].x
ldy #spritesTable[0].y
jsr drawSprite
```
#### < name > [:]
```as
// define a label (colon is optional)
loop:
	lda str, x
	beq exit
	jsr printChar
	dex
	bne loop
exit
    rts
```
#### local label !
```as
// define local labels between label
!	lda str, x
	beq !+
	jsr printChar
	dex
	bne !-
!   rts

```

## Data declaration

```as
// bytes (8 bits)
.db $01, $02, $03 ; alias .byte

// words (16 bits) little-endian
.dw $0100, $0200, $0300 ; alias .word

// long (32 bits) little-endian
.dl $01020304, $AABBCCDD, $FFEE0022 ; alias .long

// long (32 bits) big-endian
.dbyte $01020304, $AABBCCDD, $FFEE0022

// long (32 bits) big-endian
.dword $01020304, $AABBCCDD, $FFEE0022

// fill n bytes with provided value or with $00
.ds 2,$AA ; alias .fill or .res 

// advance current PC to a multiple value and fill with provided value or with $00
.align 2,$AA

// bytes as hexa dump
.hex
    0E 60 0B 00 38 43 23 00 60 6F 0B 00 40 7F 02 00
    70 38 07 00 00 60 07 00 00 60 06 00 00 50 0A 00
    00 58 1E 00 00 3E 0E 00 00 1E 1E 00 00 3C 3C 00
.end
```

## String declaration

```as
// string
.text "one", "two", "three"

// C string : null-terminated string
.cstr "one", "two" ; alias .cstring or .asciiz

// pascal string : string prefixed with a byte holding its length
.pstr "one", "two" ; alias .pstring

// long pascal string : string prefixed with a word(little-endian) holding its length
.pstrl "one", "two" ; alias .pstringl

```

## Control Flow
#### .if < expression > .else
```as
// conditional assembly
.if .len(str)>10
    .warning "str is too long !"
.else
	.log "str is valid"
.end
```
#### .repeat < times > [< iterator >]
```as
// loop n times
.repeat 2
    nop
.end
.repeat 2 idx
    lda #charList[idx]
	jsr printChar
.end
```
#### .for < iterator > of < array >
```as
// loop on array
.for colour of colours ; colours = [ "red", "green", "blue" ]
    .echo colour
.end
```

## Namespaces

The source files could be organised in namespaces in order to keep their variable declarations internal.  
The default namespace is "GLOBAL".  
When a variable or a label is declared inside a namespace, it won't be "visible" from other namespaces.  
To make a variable or a label visible everywhere, just defined it in "GLOBAL" or export it.
#### .namespace [< name >]
```as
// declaration of a namespace
.namespace loader
    count = 5
.end namespace

// to use the default namespace (GLOBAL)
.namespace
```
#### .export < name > <br/>.export < regex string >
```as
// to export a variable or label to "GLOBAL"
.namespace loader
    .export count
    count = 5
.end namespace

lda #count

// to access a variable or label not exported
.namespace loader
    count = 5
.end namespace

lda #loader.count

// to export variables which name are matching the regex
.namespace loader
    .export "pos(X|Y|Z)"
    posX	.db 0
    posY	.db 0
    posZ	.db 0
.end namespace
```

Namespaces can be nested and they use a stack for this
```as
// here, we're in global
.namespace loader
	// here, we're in loader
    count = 5

	.namespace boot
	    // here, we're in boot

		.namespace
			// here, we're in global
		.end namespace

    	// here, we're back in boot

	.end namespace

    // here, we're back in loader

.end namespace

// here, we're back in global
```

## Memory

Memory can be segmented in parts and you can set your code to be assembled for a specific part.  
This will allow you, for instance, to control whether your code can fit in a segment.  
To set up segments, you will need a yaml conf file with an entry segments with hold the map of your segments.  
For each segment, you have to define the starting and ending addresses. And optionally, a padding value to fill the unused space (default is $00).
```yaml
# jsasm.conf
segments:
  BOOT1:		{ start: 0x0800, end: 0x08FF }
  LOADER:		{ start: 0xB700, end: 0xBFFF, pad: 0xFF }
```
#### .segment < name >
```as
// use a segment
.segment loader
// here the program counter will be set to $B700, the start of the loader segment
```

You can set the program counter but with addresses in the range defined by the current segment.
```as
// set the program counter
.org $B780
* = $B780
// as we're in the loader segment, the addresses range is $B700 to $B7FF. Org values ouside that range will raise an error.
```

## Macro
#### .macro < name > [param1 ,param2, ...]
```as
// create a macro with a name and parameter(s)
	.macro printStr str
		ldx #<str
		ldy #>str
		jsr printStr
	.end

    printStr welcome
    rts
welcome
    .cstr "Welcome !"
```
#### Variable number of parameters
```as
// you can capture all the parameters using the rest notation
	.macro defStruc id, ...params
		.dw id
		.repeat .len(params) idx
		    .dw params[idx]
		.end
	.end
	defStruc $CAFE, "ABCD", $1234
```
#### Parameter Interpolation
This is useful when you want to pass a label and an addressing mode, for instance
```as
	.macro ifa condition, goto
		.dw id
		.repeat .len(params) idx
		    .dw params[idx]
		.end
	.end
	defStruc $CAFE, "ABCD", $1234
```
## Comments

You can add a comment on any line with the semicolon, ";", as usual for assembler.  
But if you are more into C-like comments, you can use instead the double slash "//".  
And if you cant to comment a whole section, you can use C-like the /* .... */.

#### Line comment ; //
```
; this is a comment

    printStr welcome ; this is another comment
    rts

welcome
    .cstr "Welcome !"

// and here you can comment out a block
```
#### Block comment /* ... */
```as
/*
.for colour of colours ; colours = [ "red", "green", "blue" ]
    .echo colour
.end
*/
```

## Miscellaneous

#### .cpu, .setcpu, .processor
```as
// tell the assembler which set if opcodes it has to use
// 6502, 65X02, 65C02
.cpu 6502 ; alias .setcpu or .processor
```
#### .option charmap
```as
// use a specific characters map for character & string declarations
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

// use .define to declare a charmap. You need to prefix the name with "charmap_"
.define charmap_apple2
[
	0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F,
	0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F,
	0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF,
	0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF,
	0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xCB, 0xCC, 0xCD, 0xCE, 0xCF,
	0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xDB, 0xDC, 0xDD, 0xDE, 0xDF,
	0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
	0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF,
	0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F,
	0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9E, 0x9F,
	0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAE, 0xAF,
	0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBE, 0xBF,
	0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xCB, 0xCC, 0xCD, 0xCE, 0xCF,
	0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xDB, 0xDC, 0xDD, 0xDE, 0xDF,
	0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEE, 0xEF,
	0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFE, 0xFF
]
.end
```
#### .list (on | off)
```as
// enable or disable the printing of the dissasembly of your code
.list on ; alias .listing or .lst
.list off
```
#### .log [param1, param2, ...] <br/> .warning [param1, param2, ...] <br/> .error [param1, param2, ...]
```as
// user print to the listing
.log "count=", count ; alias .echo or .out

// user print of warning to the listing
.warning "missing value for loader"

// user print of error to the listing
.error "missing value for loader"
```
#### .include < filename > [asBin]
```as
// include a source file
.include "./boot/loader.asm"

// include a binary file as .db
.include "./boot/logo.img" asBin
```
