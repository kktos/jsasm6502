import { describe, expect, it } from "vitest";
import { Cpu6502Handler } from "../cpu/cpu6502.class";
import { Logger } from "../logger";
import { Assembler } from "../polyasm";
import { type FileHandler } from "../polyasm.types";
import { hexDump } from "../utils/hexdump.util";

const _TEMP = `
	; Macro with optional and rest parameters
	.MACRO DEFINE_DATA_BLOCK id, name, ...values
		; .IF .ARGC < 2
		; 	.ERROR "DEFINE_DATA_BLOCK requires at least an id and a name."
		; .ENDIF
		; The {id} syntax creates a unique label for each macro invocation
		data_block_{id}:
			.DB .LEN(values) ; Number of values
			.DW values      ; The actual values as words
	.END

	; define the macro MOV
	.MACRO MOV dest, src
	  LDA src
	  STA dest
	.END

	; set the value $42 at the address $300
	MOV $300, #$42

	; set the value $56 at the address $310,Y
	MOV $310,Y, #$56

	; Use the advanced macro
	; Call with rest parameters
	DEFINE_DATA_BLOCK 1, "player_scores", $0100, $0250, $0099
	; Call with no rest parameters (optional)
	DEFINE_DATA_BLOCK 2, "level_names" ; This would generate a block with 0 values

	; define the macro INIT_REGS
	.MACRO INIT_REGS val, addr {
		LDA val
		STA addr
	}


	ZP_VAR .EQU $12
	ABS_VAR .EQU $1234
	SCREEN_WIDTH .EQU 40 * (8 + 2) - 10
	NEGATIVE_VAL .EQU -50

	.ORG $2000 + SCREEN_WIDTH

	LDA $F800 ; monitor start

	INIT_REGS #$EA, $300

	LDA.W ZP_VAR
	LDA ABS_VAR
	LDA ZP_VAR,X
	LDA.B ABS_VAR,X
	LDA (ZP_VAR),Y
	.INCLUDE "symbols.asm"
	RTS
	.INCBIN "logo.bin"
`;

const source6502 = `
Start
	.ORG $2000

	.db $AA ^ $FF
	.db $81 & $F0
	.db $01 | $20
	.align $20, $FF
	.for addr of [1,2,3,0x45,$E0,$55,$10,0b1010_1010,%1000_0001] as idx
		.db idx
		.repeat 3 as idx2 {
			.db addr
		}
	.end

	.align $10, $FF

	.hex
		0E 60 0B 00 38 43 23 00 ; with comments !!
		60 6F 0B 00 40 7F 02 00
	.end
`;

// MOCK DATA FOR .INCLUDE (Now a raw string)
const mockIncludedSource = "SUB_LABEL: STA $1000";

// MOCK DATA FOR .INCBIN (4 bytes of image header)
const mockBinaryData = [0xde, 0xad, 0xbe, 0xef];

class MockFileHandler implements FileHandler {
	readSourceFile(filename: string): string {
		// Updated method signature
		if (filename === "symbols.asm") {
			console.log(`[MOCK FH] Reading raw source content for ${filename}.`);
			return mockIncludedSource;
		}
		throw new Error(`Mock file not found: "${filename}"`);
	}

	readBinaryFile(filename: string): number[] {
		if (filename === "logo.bin") {
			console.log(`[MOCK FH] Reading raw binary data for ${filename}.`);
			return mockBinaryData;
		}
		throw new Error(`Mock bin file not found: ${filename}`);
	}
}

describe("PolyAsm", () => {
	it("assemble a source", () => {
		const mockFileHandler = new MockFileHandler();
		const logger = new Logger();
		const cpu6502 = new Cpu6502Handler();
		const assembler6502 = new Assembler(cpu6502, mockFileHandler, { logger });

		assembler6502.assemble(source6502);
		const machineCode6502 = assembler6502.link();

		console.log(`\n6502 Machine Code Bytes (Hex):\n${hexDump(0, machineCode6502)}`);

		expect(machineCode6502).toBeDefined();
	});
});

/*
const tokensARM: Token[] = [
	// 1. Constant & Label
	{ type: "IDENTIFIER", value: "START_ADDR", line: 1, col: 1 },
	{ type: "DIRECTIVE", value: ".EQU", line: 1, col: 12 },
	{ type: "NUMBER", value: "$8000", line: 1, col: 17 },

	{ type: "DIRECTIVE", value: ".ORG", line: 3, col: 1 },
	{ type: "NUMBER", value: "START_ADDR", line: 3, col: 5 },

	// 2. Data Processing (MOV R0, #$12)
	// Expected: E3A00012 (MOV, R0, #12)
	{ type: "IDENTIFIER", value: "MOV", line: 5, col: 1 },
	{ type: "IDENTIFIER", value: "R0", line: 5, col: 5 },
	{ type: "OPERATOR", value: ",", line: 5, col: 7 },
	{ type: "OPERATOR", value: "#", line: 5, col: 9 },
	{ type: "NUMBER", value: "$12", line: 5, col: 10 },

	// 3. Branch (B MyLoop)
	// Expected: EALLXXXX (Branch Always)
	{ type: "IDENTIFIER", value: "B", line: 6, col: 1 },
	{ type: "IDENTIFIER", value: "MyLoop", line: 6, col: 3 },

	// 4. Target Label
	{ type: "IDENTIFIER", value: "MyLoop", line: 8, col: 1 },

	// 5. Data Processing (MOV R1, #4)
	// Expected: E3A01004 (MOV, R1, #4)
	{ type: "IDENTIFIER", value: "MOV", line: 9, col: 1 },
	{ type: "IDENTIFIER", value: "R1", line: 9, col: 5 },
	{ type: "OPERATOR", value: ",", line: 9, col: 7 },
	{ type: "OPERATOR", value: "#", line: 9, col: 9 },
	{ type: "NUMBER", value: "4", line: 9, col: 10 },

	// 6. Return (Implied, not supported in this mock, but consumes 4 bytes)
	{ type: "IDENTIFIER", value: "BX", line: 10, col: 1 }, // Using BX as a placeholder for a 4-byte instruction
	{ type: "IDENTIFIER", value: "LR", line: 10, col: 4 },
];

 */
