# jsasm6502 - Complete Command Reference

This document provides a comprehensive reference for all assembler commands, functions, and syntax available in jsasm6502.

## Table of Contents

1. [PRAGMAS (Directives)](#pragmas-directives)
2. [SYSTEM FUNCTIONS](#system-functions)
3. [SYSTEM VARIABLES](#system-variables)
4. [OPCODES (CPU Instructions)](#opcodes-cpu-instructions)
5. [LABELS & VARIABLES](#labels--variables)
6. [EXPRESSIONS](#expressions)
7. [SPECIAL SYNTAX](#special-syntax)
8. [QUICK REFERENCE](#quick-reference)

---

## PRAGMAS (Directives)

### Memory & Code Organization

#### `.org <address>` or `* = <address>`

Set the program counter to the specified address. Must be within the current segment's range.

```as
.org $1000
* = $2000  ; Same as .org $2000
```

#### `.segment <name> { start: <n>, end: <n> [, pad: <n>] }`

Define a new memory segment.

```as
.segment BOOT { start: $0800, end: $08FF }
.segment DATA { start: $1000, end: $1FFF, pad: $FF }
```

#### `.segment <name>`

Switch to an existing segment (defined in config or previously in code).

```as
.segment BOOT
.segment CODE
```

#### `.align <value> [, <fill>]`

Align PC to the next multiple of `value` and optionally fill with `fill` byte (default: $00).

```as
.align $100      ; Align to page boundary
.align $100, $FF ; Align and fill with $FF
```

#### `.fill <count> [, <value>]` / `.ds <count> [, <value>]` / `.res <count> [, <value>]`

Fill `count` bytes with `value` (default: $00). All three are aliases.

```as
.ds 100        ; Reserve 100 bytes
.fill 10, $FF  ; Fill 10 bytes with $FF
.res 5         ; Reserve 5 bytes (zero-filled)
```

---

### Data Declaration

#### `.db <value1> [, <value2> ...]` / `.byte <value1> [, <value2> ...]`

Emit 8-bit bytes.

```as
.db $01, $02, $03
.byte 65, 66, 67
```

#### `.dw <value1> [, <value2> ...]` / `.word <value1> [, <value2> ...]`

Emit 16-bit words (little-endian).

```as
.dw $0100, $0200  ; Emits: 00 01 00 02
.word $1234        ; Emits: 34 12
```

#### `.dl <value1> [, <value2> ...]` / `.long <value1> [, <value2> ...]`

Emit 32-bit longs (little-endian).

```as
.dl $01020304  ; Emits: 04 03 02 01
```

#### `.dbyte <value1> [, <value2> ...]`

Emit 32-bit values as bytes (big-endian).

#### `.dword <value1> [, <value2> ...]`

Emit 32-bit values as words (big-endian).

#### `.hex` ... `.end`

Emit hex dump data.

```as
.hex
    0E 60 0B 00 38 43 23 00
    60 6F 0B 00 40 7F 02 00
.end
```

---

### String Declaration

All string pragmas support escape sequences: `\\`, `\n`, `\r`, `\t`, `\b`, `\f`, `\'`, `\"`, `\xHH` (hex).

#### `.text <string1> [, <string2> ...]`

Emit sequence of character bytes.

```as
.text "Hello", "World"
.text "Line1\nLine2"  ; With newline
```

#### `.cstr <string1> [, <string2> ...]` / `.cstring` / `.asciiz`

Emit null-terminated C strings.

```as
.cstr "Hello"     ; Emits: 48 65 6C 6C 6F 00
.asciiz "Test"    ; Same as .cstr
```

#### `.pstr <string1> [, <string2> ...]` / `.pstring`

Emit Pascal strings (length byte prefix).

```as
.pstr "Hello"     ; Emits: 05 48 65 6C 6C 6F
```

#### `.pstrl <string1> [, <string2> ...]` / `.pstringl`

Emit long Pascal strings (length word prefix, little-endian).

```as
.pstrl "Hello"    ; Emits: 05 00 48 65 6C 6C 6F
```

---

### Control Flow

#### `.if <expression>` ... `.else` ... `.end`

Conditional assembly. Supports C-like `{}` blocks.

```as
.if count > 10
    .warning "Too many items"
.else
    .log "OK"
.end

.if(count > 10) {
    .warning "Too many items"
} .else {
    .log "OK"
}
```

#### `.repeat <count> [<iterator>]` ... `.end`

Loop `count` times. Optional iterator variable.

```as
.repeat 5
    nop
.end

.repeat 3 idx
    lda #dataList[idx]
.end
```

#### `.for <iterator> of <array>` ... `.end`

Iterate over array elements.

```as
colours = ["red", "green", "blue"]
.for colour of colours
    .echo colour
.end
```

---

### Variables & Data

#### `<name> = <expression>`

Define simple variable (inline syntax).

```as
count = 10
address = $1000
```

#### `.define <name>` ... `.end`

Define complex variable from YAML/JSON block.

```as
.define spritesTable
    - { id: 0xaa, x: 0xa0, y: 0x10 }
    - { id: 0xbb, x: 0xb0, y: 0x20 }
.end

lda #spritesTable[0].id    ; Access array element
```

**Note:** Array indices are checked at parse time. Out-of-bounds access (index >= array length) will throw an error.

#### `.let <name> = <expression>`

Define variable (pragma syntax). **Key difference from `=`**: The variable name can be a **string expression**, allowing dynamic variable names.

```as
.let count = 10
.let "var" + "Name" = 42  ; Creates variable "VARNAME" with value 42
```

**Comparison:**

- `<name> = <expression>` - Requires literal identifier name
- `.let <name> = <expression>` - Allows string expression for dynamic variable names

---

### Macros

#### `.macro <name> [param1, param2, ...]` ... `.end`

Define macro with comma-separated parameters.

```as
.macro printStr str
    ldx #<str
    ldy #>str
    jsr printStr
.end

printStr welcome
```

#### `.macro <name> [param1 : param2 : ...]` ... `.end`

Define macro with colon-separated parameters (useful for addressing modes).

```as
.macro drawSprite %id : %x : %y {
    lda %id
    ldx %x
    ldy %y
    jsr $1500
}

drawSprite Lid,x : #$62 : #$31
```

#### Macro Parameter Interpolation

**String Interpolation** `%(<expr>)`:

```as
.macro ifx expr, goto
    expr = .split(%(expr))
    cpx %(expr[1])
    bcc goto
.end

ifx "spriteX < #130", next
```

**Variable Interpolation** `%<name>`:

```as
.macro loadVar var
    lda %var
.end

var = #$45
loadVar var  ; Expands to: lda #$45
```

**Rest Parameters** `...parms`:

```as
.macro defStruc id, ...parms
    .dw id
    .repeat .len(parms) idx
        .dw parms[idx]
    .end
.end
```

---

### Functions

#### `.function <name>` ... `.end`

Define a function (creates label scope for internal labels).

```as
.function myFunc
    innerLabel:
        lda #$00
    rts
.end

myFunc  ; Call function
```

---

### Namespaces

#### `.namespace [<name>]` ... `.end namespace`

Define/enter namespace. Empty name returns to GLOBAL.

```as
.namespace utils
    count = 5
.end namespace

.namespace  ; Return to GLOBAL
.end namespace
```

#### `.export <name>`

Export symbol from current namespace to GLOBAL.

```as
.namespace loader
    .export count
    count = 5
.end namespace

lda #count  ; Now accessible
```

#### `.export "<regex>"`

Export symbols matching regex pattern.

```as
.namespace loader
    .export "pos(X|Y|Z)"
    posX .db 0
    posY .db 0
    posZ .db 0
.end namespace
```

**Note:** To access non-exported symbols, use namespace prefix: `loader.count`

---

### File Management

#### `.include <filename> [asBin]`

Include source file. With `asBin`, includes binary as `.db` data.

```as
.include "./boot/loader.asm"
.include "./data/logo.bin" asBin
```

---

### Output & Listing

#### `.log [param1, param2, ...]` / `.echo` / `.out`

Print to listing/console output.

```as
.log "count=", count
.echo "Done"
```

#### `.warning [param1, param2, ...]`

Print warning message.

```as
.warning "This is deprecated"
```

#### `.error [param1, param2, ...]`

Print error message and stop assembly.

```as
.error "Invalid configuration"
```

#### `.list on|off` / `.listing on|off` / `.lst on|off`

Enable/disable listing output (if globally enabled).

```as
.list on
; ... code ...
.list off
```

#### `.list file <filename>`

Set listing filename for current file.

```as
.list file "output"
```

---

### Configuration

#### `.cpu <type>` / `.setcpu <type>` / `.processor <type>`

Set CPU type: `6502`, `65C02`, or `65X02`.

```as
.cpu 6502
.setcpu 65C02
```

#### `.option charmap <name>` / `.opt charmap <name>`

Set character map for string encoding. Use `NONE` to disable charmap (use raw character codes).

```as
.option charmap apple2
.option charmap NONE      ; Disable charmap, use raw codes
```

Define custom charmap:

```as
.define charmap_apple2
[0xC1, 0xC2, 0xC3, ...]  ; Maps ASCII A->$C1, etc.
.end

.option charmap apple2
```

#### `.end`

End current block or stop assembly:

- Inside function → ends function
- Inside namespace → ends namespace (use `.end namespace` for clarity)
- Otherwise → stops assembly completely

---

## SYSTEM FUNCTIONS

All functions are **case-insensitive** (identifiers are uppercased). Functions are prefixed with `.` and called with parentheses.

#### `.def(<value|label>)`

Returns 1 if defined, 0 otherwise.

```as
.if .def(printStr)
.if .def("printStr") && .def("utils.getKey")
```

#### `.undef(<value|label>)`

Returns 1 if not defined, 0 otherwise.

```as
.if .undef(printStr)
    printStr:
        ldx #0
.end
```

#### `.len(<array|string>)`

Returns length of array or string.

```as
count = .len(spritesTable)
strLen = .len("Hello")  ; 5
```

#### `.hex(<value> [, <minDigits>])`

Converts number to hexadecimal string.

```as
.echo .hex(10)      ; "$0A"
.echo .hex(10, 4)   ; "$000A"
```

#### `.type(<value>)`

Returns type string: `"string"`, `"number"`, `"object"`, or `"array"`.

```as
.if .type(val) = "string"
```

#### `.split(<string> [, <delimiter>])`

Splits string into array. Default delimiter is space.

```as
params = .split("one two three")       ; ["one","two","three"]
params = .split("a,b,c", ",")          ; ["a","b","c"]
```

#### `.array([item1, item2, ...])`

Creates array from parameters.

```as
list = .array($45, $46, 89)
empty = .array()
```

#### `.push(<array>, item1 [, item2, ...])`

Adds items to end of array, returns array.

```as
nums = .array(0, 1)
list = .push(nums, 2, 3)  ; [0, 1, 2, 3]
```

#### `.pop(<array>)`

Removes and returns last item from array.

```as
nums = .array(1, 2, 3)
last = .pop(nums)  ; 3, nums is now [1, 2]
```

#### `.eval(<string>)`

Evaluates string as assembly expression.

```as
count = .array(1, 2, 3)
str = ".len(count)"
.echo .eval(str)  ; "3"
```

#### `.iif(<expr>, <trueValue>, <falseValue>)`

Returns `trueValue` if `expr != 0`, else `falseValue`.

```as
addr = $1000
.echo .iif(addr > $1000, "greater", "not greater")
.echo .iif(addr = $1000, "equal", "not equal")
```

#### `.json(<value>)`

Converts value to JSON string representation.

```as
obj = { x: 10, y: 20 }
str = .json(obj)  ; '{"x":10,"y":20}'
```

---

## SYSTEM VARIABLES

All system variables are **read-only** and prefixed with `.`.

#### `.cpu` / `.CPU`

Current CPU type (string).

```as
.echo .cpu  ; "6502" or "65C02"
```

#### `.namespace` / `.NS`

Current namespace name (string).

```as
.echo .namespace  ; "GLOBAL" or current namespace
```

#### `.pc` / `*`

Program counter (number).

```as
.echo .pc
.echo *        ; Same as .pc
```

#### `.segment`

Segment object with properties:

- `.segment.name` / `.SEGMENTNAME` - Segment name (string)
- `.segment.start` / `.SEGMENTSTART` - Start address (number)
- `.segment.end` / `.SEGMENTEND` - End address (number)
- `.segment.size` / `.SEGMENTSIZE` - Size in bytes (number)

```as
.echo .segment.name
.echo .segment.start
```

#### `.filename` / `.FILENAME`

Current source filename (string).

```as
.echo .filename
```

---

## OPCODES (CPU Instructions)

Supports **6502**, **65C02**, and **65X02** instruction sets.

### Opcode Size Suffixes

Force addressing mode size:

- `.b` - Force 8-bit addressing
- `.w` - Force 16-bit addressing

```as
lda.b #$12      ; Forces 8-bit immediate
lda.w $1234     ; Forces 16-bit absolute
lda.b $10,x     ; Forces zero-page indexed
```

### Standard 6502/65C02 Instructions

**Load/Store:**

- `LDA`, `LDX`, `LDY`, `STA`, `STX`, `STY`, `STZ` (65C02)

**Arithmetic:**

- `ADC`, `SBC`, `INC`, `DEC`, `INX`, `INY`, `DEX`, `DEY`, `INA` (65C02), `DEA` (65C02)

**Logic:**

- `AND`, `ORA`, `EOR`, `ASL`, `LSR`, `ROL`, `ROR`

**Compare:**

- `CMP`, `CPX`, `CPY`, `BIT`

**Branch:**

- `BCC`, `BCS`, `BEQ`, `BMI`, `BNE`, `BPL`, `BVC`, `BVS`
- `BRA` (65C02)
- `BBR`, `BBS` (65X02 - branch on bit)

**Jump/Subroutine:**

- `JMP`, `JSR`, `RTS`, `RTI`

**Stack:**

- `PHA`, `PHP`, `PLA`, `PLP`, `TSX`, `TXS`
- `PHX`, `PHY`, `PLX`, `PLY` (65C02)

**Status Flags:**

- `CLC`, `CLD`, `CLI`, `CLV`, `SEC`, `SED`, `SEI`

**Transfer:**

- `TAX`, `TAY`, `TXA`, `TYA`, `TSX`, `TXS`

**Other:**

- `NOP`, `BRK`
- `TRB`, `TSB` (65C02)
- `RMB`, `SMB` (65X02 - reset/set memory bit)

### Addressing Modes

- **Implied**: `NOP`, `CLC`
- **Immediate**: `LDA #$12`
- **Absolute**: `LDA $1234`
- **Zero Page**: `LDA $12`
- **Indexed (X)**: `LDA $1234,X` or `LDA $12,X` (ZP)
- **Indexed (Y)**: `LDA $1234,Y` or `LDA $12,Y` (ZP)
- **Indirect**: `JMP ($1234)`
- **Indirect Indexed**: `LDA ($12),Y`
- **Indexed Indirect**: `LDA ($12,X)`
- **Relative**: `BEQ label` (for branch instructions)

---

## LABELS & VARIABLES

### Regular Labels

```as
loop:
    lda str, x
    beq exit
    jmp loop
exit:
    rts
```

Colon is optional: `loop:` same as `loop`

### Local Labels

Local labels use `!` or `:` and are relative to the previous regular label.

**Defining:**

```as
main:
!   lda #$00    ; Local label
    beq !+       ; Forward reference
    jmp !-       ; Backward reference
!   rts          ; Local label
```

**Relative references:**

- `!` - First local label forward
- `!+` - Next local label forward
- `!++` - Second local label forward
- `!-` - Previous local label backward
- `!--` - Second local label backward
- `!+N` - Nth local label forward
- `!-N` - Nth local label backward

---

## EXPRESSIONS

### Number Literals

```as
value = 170         ; Decimal
value = $AA         ; Hexadecimal
value = %10101010   ; Binary
value = 0xAA        ; Hexadecimal (C-style)
value = 0b10101010  ; Binary (C-style)
value = 0b1010_1010 ; Binary with separator
```

### Arithmetic Operators

```as
count = 1 + 1
value = 6 * -1
result = (a + b) / 2
```

- `+` - Addition
- `-` - Subtraction
- `*` - Multiplication
- `/` - Division
- `-` (unary) - Negation

### Comparison Operators

```as
.if value != $55
.if count >= 10
.if str = "test"
```

- `<`, `<=`, `>`, `>=` - **Numeric comparisons only** (both operands must be numbers)
- `=`, `!=` - Equality comparison (works for numbers and strings)
  - **String comparison**: Compares string values directly
  - **Number vs String**: Allows comparison between single-character strings and their character codes

### Boolean Logic

```as
.if !count || (value = 6 && key = 1)
```

- `!` - NOT
- `&&` - AND
- `||` - OR

### Bitwise Operators

```as
char = $41 | $80        ; OR: $C1
flags = flags & %11111110  ; AND: clear bit 0
result = value ^ $FF    ; XOR: invert
```

- `&` - Bitwise AND
- `|` - Bitwise OR
- `^` - Bitwise XOR

**Limitations:**

- **No shift operators**: `<<` (left shift) and `>>` (right shift) are **not supported**
- **No modulo operator**: `%` (modulo) is **not supported**; use division and manual calculation if needed

### 16-bit Address Operations

```as
lda #>$1232   ; MSB: $12
lda #<$1232   ; LSB: $32
```

- `>` - Most Significant Byte (MSB)
- `<` - Least Significant Byte (LSB)

### String Concatenation

```as
name = "John" + " " + "Doe"
full = first + " " + last
```

---

## SPECIAL SYNTAX

### Comments

```as
; Line comment
lda #$00  ; Inline comment

// C-style line comment

/* Block comment
   Can span multiple lines
*/
```

### Character Literals

```as
char = "A"      ; Character code (via charmap if set)
char = 'A'      ; Same
lda #"A"        ; In expression
```

### Special Characters in Strings

Escape sequences supported:

- `\\` - Backslash
- `\n` - Newline
- `\r` - Carriage return
- `\t` - Tab
- `\b` - Backspace
- `\f` - Form feed
- `\'` - Single quote
- `\"` - Double quote
- `\xHH` - Hexadecimal character code

```as
.text "Line1\nLine2"
.text "Path\\file"
.text "\x41"  ; 'A'
```

---

## QUICK REFERENCE

### Common Patterns

**Loop with counter:**

```as
.repeat 10 i
    lda #data[i]
.end
```

**Conditional code:**

```as
.if DEBUG
    .log "Debug mode"
.end
```

**Macro with addressing:**

```as
.macro loadAddr addr : reg {
    lda %addr
    sta %reg
}

loadAddr $1000 : $2000
```

**Namespace with exports:**

```as
.namespace utils
    .export "helper*"
    helper1: ...
    helper2: ...
.end namespace
```

**Function with internal labels:**

```as
.function init
    temp1:  ; Only visible inside function
        lda #$00
    rts
.end
```

**Array iteration:**

```as
data = [1, 2, 3, 4]
.for value of data
    .db value
.end
```

---

**Last Updated:** Based on jsasm6502 source code analysis
