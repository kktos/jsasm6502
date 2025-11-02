# jsasm6502

- [Package](#introduction)
  * [Introduction](#introduction)
  * [Usage](#usage)
  * [API](#api)
  * [Examples](#examples)
  * [Complete Reference](#complete-reference)
- [Assembler Syntax](#assembler-syntax)
  * [Expressions](#expressions)
  * [System Functions](#system-functions)
  * [System Variables](#system-variables)
  * [Variables & Labels](#variables-and-labels)
  * [Data declaration](#data-declaration)
  * [String declaration](#string-declaration)
  * [Control Flow](#control-flow)
  * [Namespaces](#namespaces)
  * [Memory](#memory)
  * [Macros](#macros)
  * [Comments](#comments)
  * [Miscellaneous](#miscellaneous)

## Introduction
6502/65C02 assembler in typescript  
Inspired by virtual assembler by mass:werk and the fact I needed to have it running locally ;)

![CI](https://github.com/kktos/jsasm6502/actions/workflows/CI.yml/badge.svg)  
[RELEASES](https://github.com/kktos/jsasm6502/blob/main/RELEASES.md)


## Complete Reference

For a comprehensive reference of all assembler commands, functions, opcodes, and syntax, see **[REFERENCE.md](REFERENCE.md)**.

## Usage
```shell
asm6502 sourcefile.asm [-c <configfile.yml>]
```
## Configuration File

Configuration can be provided via a YAML file (e.g., `jsasm.conf`) passed with the `-c` command-line option.

### `segments`

Memory can be segmented into parts, and you can set your code to be assembled for a specific part. This allows you to control whether your code can fit in a segment.

For each segment, you must define the `start` and `end` addresses. You can also optionally provide a `pad` value to fill unused space (defaults to `$00`).

```yaml
# jsasm.conf
segments:
  BOOT1:    { start: 0x0800, end: 0x08FF }
  LOADER:   { start: 0xB700, end: 0xBFFF, pad: 0xFF }
```

### `symbols`

You can define global symbols in the configuration file. These symbols are accessible from any part of your code.

```yaml
# jsasm.conf
symbols:
  SCREEN_WIDTH: 40
  SCREEN_HEIGHT: 25
  COLORS:
    - RED
    - GREEN
    - BLUE
```

## API

### assemble
function assemble(source, options): TAssemblerResult

### - source
Either a string for a file pathname
```
source: string
```
Or an object containing the source code to assemble
```
source: { name: string; content: string }
```
### - options
```typescript
{	
	/*
		- cpu type : "6502" or "65C02"
		- optional
		- default : "6502"
	*/
	cpu: string;

	/*
		- activate or desactivate the listing print out
		- optional
		- default : false
	*/
	listing: boolean;

	/*
		- the console is used for all the listing output
		  if you need to capture it, set it to your own console implementation
		- optional
		- default : system console
	*/
	console: TConsole;

	/*
		- the memory segments definition. See Memory for further explanation
		- optional
		- default : { CODE: { start: 0x1000, end: 0xffff } }
	*/
	segments: TSegments;

	/*
		- function called to read a source file
		- mandatory

		type ReadFileReturn = {
			error: string;
			path: string;
			dir: string;
			content: string | Buffer;
		};

		type ReadFileFunction = (filename: string, fromFile?: string, asBin?: boolean) => ReadFileReturn;
	*/
	readFile: ReadFileFunction;

	/*
		- function called by pragma .define to read a yaml file
		- optional if you don't need .define
	*/
	YAMLparse: (filename: string) => Record<string, unknown> | boolean | number | string;
}
```
### - TAssemblerResult
```typescript
{
	/*
		Dictionnary of symbols
	*/
	symbols: Dict<TExprStackItem>;
	/*
		Segments. Same as input.
	*/
	segments: TSegments;
	/*
		Dictionnary of segments where each entry is an array of bytes
	*/
	obj: TCodeObj;
	/*
		assembler output with bytes and disassembly
	*/
	disasm: string;
	/*
		hexdump of the specified segment
	*/
	dump: (segmentName: string, bytePerLine?: number) => void;
	/*
		if not null, the error which has stopped the assembler
	*/
	error: string | null;
}
```

## Examples
### browser
```javascript
import {assemble} from "jsasm6502";
const asmFile = `
	loop:
	lda #"A
	sta $1000
	bpl loop
`;
const src= { name: "test-file", content: asmFile };
const asmRes = assemble(src, opts);
console.log("----- DISASM -----");
console.log(asmRes.disasm.trim());
console.log("----- OBJ -----");
console.log(asmRes.obj);
console.log("----- HEXDUMP -----");
asmRes.dump("CODE");
console.log("----- SEGMENTS -----");
console.log(asmRes.segments);
console.log("----- SYMBOLS -----");
console.log(asmRes.symbols.dump());
/*
----- DISASM -----
loop:
1000:  A9 41                            lda #"A
1002:  8D 00 10                         sta $1000
1005:  10 F9                            bpl loop
----- OBJ -----
{
  CODE: [
    169, 65, 141, 0,
     16, 16, 249
  ]
}
----- HEXDUMP -----
1000: A9 41 8D 00 10 10 F9
----- SEGMENTS -----
{ CODE: { start: 4096, end: 65535, size: 61440 } }
----- SYMBOLS -----
GLOBAL:
  LOOP: number = $1000 ; "test-file":2
*/  
```
### node
```javascript
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { load } from "js-yaml";

function readFile(filename: string, fromDir?: string, asBin?: boolean): ReadFileReturn {
	try {
		const includeDir = fromDir ?? "";
		const path = (includeDir !== "" ? `${includeDir}/` : "") + filename;
		const content = readFileSync(`${rootDir}/${path}`);
		return {
			path,
			dir: dirname(path),
			content: asBin ? content : content.toString(),
			error: "",
		};
	} catch (e) {
		return {
			path: "",
			dir: "",
			content: "",
			error: (e as Error).message,
		};
	}
}

function YAMLparse(yaml: string): Record<string, unknown> | boolean | number | string {
	try {
		return load(yaml) as Record<string, unknown>;
	} catch (e) {
		console.error("YAMLparse", e);
		return "";
	}
}

const opts: Options = {
	readFile,
	YAMLparse,
};
/*
  ...
*/
const asmRes = assemble(filename, opts);

```

# Assembler Syntax

## Expressions

```as
// Numbers
value = 170          // base 10
value = $AA          // base 16 - hexadecimal
value = %10101010    // base 2  - binary
value = 0xAA         // base 16 - hexadecimal
value = 0b10101010   // base 2  - binary
value = 0b1010_1010  // with separator to ease the reading

// Number Arithmetic
// + - * /
count = 1+1
value = 6 * -1

// Strings
// + : concatenation
str = firstname + " " + lastname

// Number Comparisons
// < <= > >= = !=
.if value != $55

// String Comparisons
// = !=
.if str = "boom"

// Boolean logic
// !:not ||:or &&:and
.if !count || value=6 && withKey=1

// Boolean arithmetic
// &:and |:or ^:xor
char = $41 | $80             // $C1
flags = flags | %1000_0000   // set bit7

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
#### .hex( < value > [,< minimumDigits >] )
```as
// returns a string representing in hexa the parameter value 
count = 10
.echo .hex(count)    // will output $0A
.echo .hex(count, 4) // will output $000A
```
#### .type( < value > )
```as
// returns a string representing the type of the parameter value 
// it'll be : string | number | object | array
.if .type(val) = "string"
```
#### .split( < string value > [,< delimiter >] )
```as
// divides the given string using the delimiter as a cut point and returns an array of strings 
// if the delimiter is not given, space will be used
// no delimiter -> " "
params= .split("one two three")        // ["one","two","three"]
// with delimiter
params= .split("one,two,three", ",")   // ["one","two","three"]
```
#### .array( [parameter1 ,parameter2, ...] )
```as
// returns an array made of all the parameters 
list= .array($45,$46,89)               // [$45,$46,89]
list= .array()               		   // []
```
#### .push( < value as array >, item1 [,item2, ...] )
```as
// adds one to many items at the end of the given array and returns it
numbers= .array(0,1)                   // [$00,$01]
list= .push(numbers, 2,3)              // [$00,$01,$02,$03]
```
#### .pop( < value as array > )
```as
// removes one item at the end of the given array
last= .pop(numbers)                  // 3
```
#### .eval( < string value > )
```as
// evaluates the string as asm source.
count= .array(1,2,3)
str= ".len(count)"
.echo .eval(str) ; "3"
```
#### .iif( < expr as number >, < true value >, < false value > )
```as
// returns a value depending on a boolean expression (=0 or !=0)
addr = $1000
.echo .iif(addr>$1000, "greater", "not greater") ; "not greater"
.echo .iif(addr=$1000, "equal", "not equal") ; "equal"
```
## System Variables

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

## Variables and Labels
#### < name > = expression
```as
// define a simple variable
cout = $FDED
```
#### .define < name >
```as
// define a complex variable with yaml or json file
.define spritesTable from "sprites.yml"

// or inline
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
.align $100,$AA    // align on next page. e.g: if pc = $15F0, will fill up 16 bytes value $AA

// bytes as hexa dump
.hex
    0E 60 0B 00 38 43 23 00 60 6F 0B 00 40 7F 02 00
    70 38 07 00 00 60 07 00 00 60 06 00 00 50 0A 00
    00 58 1E 00 00 3E 0E 00 00 1E 1E 00 00 3C 3C 00
.end
```

## String declaration
All the string pragmas are using the currently defined charmap.
#### .text < string1 > [ , < string2 > ... ]
```as
// sequence of bytes as charasters
.text "one", "two", "three"
```
#### .cstr < string1 > [ , < string2 > ... ]
```as
// C string : null-terminated string
.cstr "one", "two" ; alias .cstring or .asciiz
```
#### .pstr < string1 > [ , < string2 > ... ]
```as
// pascal string : string prefixed with a byte holding its length
.pstr "one", "two" ; alias .pstring
```
#### .pstrl < string1 > [ , < string2 > ... ]
```as
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

// C-like
.if(.len(str)>10) {
    .warning "str is too long !"
} .else {
	.log "str is valid"
}
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
To set up segments, you have 2 ways : the conf file or in your sources.

See the [Configuration File](#configuration-file) section for details on how to set up segments in the YAML configuration file.

#### .segment < name > { start: < number >, end: < number > [, pad: < number >] }
```as
// add a segment
.segment INTRO		{ start: $6000, end: $AFFF }
// here the program counter will be set to $6000, the start of the INTRO segment  
// And its value will be allowed to be between $6000 and $AFFF
```

#### .segment < name >
And to use a segment :
```as
// use a segment
.segment loader
// here the program counter will be set to $B700, the start of the loader segment
```

You can set the program counter but only with addresses in the range defined by the current segment.
```as
// set the program counter
.org $B780
* = $B780
// as we're in the loader segment, the addresses range is $B700 to $B7FF.  
// Org values ouside that range will raise an error.
```

## Macros
#### .macro < name > [param1 ,param2, ...] <br/>.macro < name > [param1 : param2 : ...]
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
```as
// they could also be declared with C-like block
	.macro printStr str {
		ldx #<str
		ldy #>str
		jsr printStr
	}
```
#### Variable number of parameters
```as
// you can capture all the parameters using the rest notation
	.macro defStruc id, ...parms
		.dw id
		.repeat .len(parms) idx
			.if .type(parms[idx]) = "string"
				.cstr parms[idx]
			.else
				.dw parms[idx]
			.end
		.end
	.end

	defStruc $CAFE, "ABCD", $1234
	/*
	will emit
	0000: FE CA
	0002: 41 42 43 44 00
	000A: 34 12
	*/
```
#### Parameter String Interpolation
This is useful when you want to pass a label and an addressing mode, for instance
```as
	.macro ifx ...parms
		.if .len(parms)!=2
			.error "Macro ifx : needs 2 params"
		.end

		.if .type(parms[0])!="string"
			.error "Macro ifx : the first parm <",parms[0],"> needs to be a string"
		.end

		expr= .split(parms[0])
		goto= parms[1]
		parmIdx= 0

		.if .len(expr)=3
			ldx %(expr[parmIdx])
			parmIdx= parmIdx + 1
		.end

		op= expr[parmIdx]
		value= expr[parmIdx+1]

		.if op="<"
			cpx %(value)
			bcc goto
		.end

		.if op=">"
			cpx %(value)
			beq :+
			bcs goto
			:
		.end
	.end

	spriteX = $1000
	ifx "spriteX < #130", next

	/*
	will emit
	0000: AE 00 10 ; ldx spriteX
	0000: E0 82    ; cpx #130
	0000: 90 xx    ; bcc next
	*/
```
#### Parameter Variable Interpolation
When you want to use the addressing modes directly, as with an opcode.  
In order to be able to use indexed addressing mode, you will have to use a colon : as separator for parameters.
```
	.org $1000

	spriteIdx:
		.db 00

	.macro drawSprite(%id : %x : %y) {
		lda %id
		ldx %x
		ldy %y
		jsr $1500
	}

	ldx spriteIdx
	drawSprite Lid,x : #$62 : #$31
	rts

	Lid:
		.db $5D
		.db $FF

	/*
	will emit
	xxxx: AE 00 10 ; ldx spriteIdx
	xxxx: BD 0E 10 ; lda Lid,x
	xxxx: A2 62    ; ldx #$62
	xxxx: A0 31    ; ldy #$31
	xxxx: 20 00 15 ; jsr $1500
	xxxx: 60 	   ; rts
	xxxx: 5D 	   ;
	xxxx: FF 	   ;
	*/
```

## Comments

You can add a comment on any line with the semicolon, ";", as usual for assembler.  
But if you are more into C-like comments, you can use instead the double slash "//".  
And if you cant to comment a whole section, you can use C-like the /* .... */.

#### Line comment ; //
```as
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
#### .list (on | off) <br/> .list file < filename > 
```as
// it works only if the listing is enabled globally (conf file)
// enable or disable the printing of the dissasembly of your code
.list on ; alias .listing or .lst
.list off

// set the listing filename for the current file
// if current file is main.asm it will save the listing in main.lst
.list file .filename
// it will save the listing in test.lst
.list file "test"
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
