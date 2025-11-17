# PolyAsm Assembler Features

This document outlines the key features and capabilities of the PolyAsm assembler, a powerful and extensible multi-pass assembler.

## Core Concepts

### Two-Pass Design
PolyAsm uses a traditional two-pass assembly process, which allows for powerful features like forward referencing.

*   **Pass 1**: Scans the entire source code to build a comprehensive symbol table. It calculates the address of all labels and the value of all constants before code generation begins.
*   **Pass 2**: Performs code generation, macro expansion, and loop unrolling. Using the symbol table from Pass 1, it can resolve all expressions and generate the final machine code.

### CPU Agnostic
The assembler is designed to be CPU-agnostic. The core logic for parsing, expression evaluation, and directive handling is separate from the instruction encoding. A `CPUHandler` interface allows plugging in support for different architectures like 6502, ARM, etc.

## Symbols and Expressions

### Label Definition
Labels can be defined to mark addresses in code. There are two supported syntaxes:

```asm
MyLabel:
    LDA #$00 ; MyLabel is assigned the address of this instruction

AnotherLabel
    STA $1000 ; AnotherLabel is also assigned the address
```

### Constant Definition
Constants can be defined using `.EQU` or `=`. The value can be a numeric expression.

```asm
SCREEN_WIDTH  .EQU 40
SCREEN_HEIGHT = 25
SCREEN_SIZE   = SCREEN_WIDTH * SCREEN_HEIGHT
```

### The Program Counter (`*`)
The current program counter address can be accessed in any expression using the `*` symbol.

```asm
    .ORG $C000
    JMP * + 6 ; Jumps 6 bytes forward from the start of this JMP instruction
```

### Expression Evaluation
PolyAsm includes a powerful expression evaluator that supports:
*   **Operators**: `+`, `-`, `*`, `/` (integer division), `&` (bitwise AND), `|` (bitwise OR), `^` (bitwise XOR).
*   **Precedence**: Standard mathematical order of operations.
*   **Parentheses**: `( ... )` for grouping.
*   **Unary Minus**: `LDA #-10`
*   **Number Formats**:
    *   Decimal: `123`
    *   Hexadecimal: `$7B`
    *   Binary: `%01111011`
*   **Array Literals**: `[1, 2, "hello", MyLabel]` for use with directives like `.FOR`.

## Directives

Directives control the assembly process.

### Memory and Data

*   **`.ORG <address>`**
    Sets the program counter to a specific address.
    ```asm
    .ORG $8000
    ```
*   **`.DB` / `.BYTE`**, **`.DW` / `.WORD`**, **`.DL` / `.LONG`**  
    Define data of 1, 2, or 4 bytes respectively. They accept comma-separated lists of numeric expressions or strings. Multi-byte values are stored in **little-endian** byte order (least significant byte first).
    ```asm
    MyData:
      .DB "Hello!", 0  ; Define a null-terminated string
      .DW $1000, MyLabel, * + 10
    ```
*   **`.TEXT <string>, ...`**  
    Defines one or more raw character strings without any prefix or suffix.
    ```asm
    Greeting: .TEXT "HELLO"
    ; Emitted bytes: 48 45 4C 4C 4F
    ```
*   **`.CSTR <string>, ...`**  
    Defines one or more null-terminated C-style strings. A `0x00` byte is appended to each string. Aliases: `.CSTRING`, `.ASCIIZ`.
    ```asm
    Prompt: .CSTR "Name:"
    ; Emitted bytes: 4E 61 6D 65 3A 00
    ```
*   **`.PSTR <string>, ...`**  
    Defines one or more Pascal-style strings, prefixed with a single byte indicating the string's length.
    ```asm
    PName: .PSTR "Pascal"
    ; Emitted bytes: 06 50 61 73 63 61 6C
    ```
*   **`.PSTRL <string>, ...`**  
    Defines one or more long Pascal-style strings, prefixed with a little-endian word (2 bytes) indicating the string's length.
    ```asm
    PLName: .PSTRL "Long Pascal"
    ; Emitted bytes: 0B 00 4C 6F 6E 67 20 50 61 73 63 61 6C
    ```
*   **`.FILL <count> [, <value>]`**
    Fills a block of memory. It reserves `<count>` bytes, with each byte initialized to `<value>`. If `<value>` is omitted, it defaults to `0`. `.DS` and `.RES` are aliases for `.FILL`.
    ```asm
    ZeroPageBuffer: .ORG $80
      .FILL 128  ; Reserves 128 bytes, filled with 0
    ScreenBuffer:
      .RES 1024, $20 ; Reserves 1024 bytes, filled with spaces
    ```
*   **`.ALIGN <boundary> [, <value>]`**
    Aligns the program counter to the next address that is a multiple of `<boundary>`. The skipped bytes are filled with `<value>`, which defaults to `0x00`.
    ```asm
    .ALIGN 256 ; PC will be advanced to the next $xx00 address
    .ALIGN 4, $EA ; Align to a 4-byte boundary, filling with NOPs
    PaletteData: .DB ...
*   **`.HEX { ... }` or `.HEX ... .END`**
    Defines a block of raw hexadecimal data. Whitespace and comments are ignored.
    ```asm
    SpriteData: .HEX
        0F 3C 7E 66 ; Row 1
        C3 E7 FF DB ; Row 2
    .END
    ```
    ```

### File Inclusion

*   **`.INCLUDE "filename.asm"`**
    Includes and tokenizes another source file inline. Handled during Pass 1.
*   **`.INCBIN "filename.bin"`**
    Includes a raw binary file directly into the output.

### Symbol Management

*   **`.NAMESPACE <name>`**
    Switches the current symbol context to a named scope. This helps prevent name collisions in large projects.
    ```asm
    .NAMESPACE GFX
    Palette: .DB $0F,$16,$27

    .NAMESPACE SOUND
    Waveform: .DB $00,$11,$22
    ```

### Conditional Assembly
Assemble blocks of code based on compile-time conditions.

```asm
VERSION = 2

.IF VERSION == 1
  LDA #$01
.ELSEIF VERSION == 2
  LDA #$02
.ELSE
  LDA #$FF
.END
```

### Looping Constructs
PolyAsm supports powerful and flexible looping directives. Loop blocks can be delimited by `.END` or by `{ ... }`.

*   **`.REPEAT <count> [AS <iterator>]`**
    Repeats a block of code a specified number of times. The optional iterator is a 1-based counter.
    ```asm
    ; Repeats 5 times, with 'i' having values 1, 2, 3, 4, 5
    .REPEAT 5 AS i
      .DB i
    .END
    ```

*   **`.FOR <item> OF <array> [AS <index>]`**
    Iterates over the elements of an array. The array can be defined directly or come from a symbol. The optional index is a 0-based counter.
    ```asm
    JumpTable: .EQU [$1000, $2000, $3000]

    .FOR addr OF JumpTable AS idx
      .DB idx      ; 0, 1, 2
      .DW addr     ; $1000, $2000, $3000
    .END
    ```

### Macros
Macros allow you to define reusable templates of code.

*   **Definition**: `.MACRO <Name> [param1, param2, ...]`
*   **Parameter Substitution**: Use `{param}` inside the macro body.
*   **Invocation**: Simply use the macro name as if it were an instruction.

```asm
; Define a macro to set a 16-bit value
.MACRO SetWord value, address, id
  LDA #<{value}
  STA {address}
  LDA #>{value}
  STA {address} + 1
  Label_{id}: RTS ; Parameters can be used in label names
.END

; Use the macro
SetWord $1234, $D020, 1
```

---
