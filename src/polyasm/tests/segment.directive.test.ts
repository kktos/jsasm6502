import { describe, expect, it } from "vitest";
import { Cpu6502Handler } from "../cpu/cpu6502.class";
import { Assembler } from "../polyasm";
import type { FileHandler } from "../polyasm.types";

const mockFileHandler: FileHandler = {
	readSourceFile: (_filename: string) => "",
	readBinaryFile: (_filename: string) => [],
};

describe("Polymer Assembler - Segments", () => {
	it("should define and use a new segment", () => {
		const cpu = new Cpu6502Handler();
		const assembler = new Assembler(cpu, mockFileHandler);
		const source = `
      .SEGMENT CODE { start: 0x8000, end: 0x8FFF }
      .SEGMENT "VECTORS" { start: 0xFFFA, end: 0xFFFF, pad: 0xEA }

      .SEGMENT "CODE"
      LDA #$42
      JMP $1234

      .SEGMENT "VECTORS"
      .WORD $8000
    `;

		const segments = assembler.assemble(source);

		const codeSegment = segments.find((s) => s.name === "CODE");
		expect(codeSegment).toBeDefined();
		expect(codeSegment?.start).toBe(0x8000);
		expect(codeSegment?.size).toBe(0x1000);
		expect(codeSegment?.data.slice(0, 5)).toEqual([0xa9, 0x42, 0x4c, 0x34, 0x12]);

		const vectorsSegment = segments.find((s) => s.name === "VECTORS");
		expect(vectorsSegment).toBeDefined();
		expect(vectorsSegment?.start).toBe(0xfffa);
		expect(vectorsSegment?.size).toBe(6);
		expect(vectorsSegment?.padValue).toBe(0xea);

		// Check the content of the vectors segment
		// .WORD $8000 should be at the start of VECTORS (0xFFFA)
		// Followed by pad value
		const expectedVectors = [0x00, 0x80, 0xea, 0xea, 0xea, 0xea];
		expect(vectorsSegment?.data).toEqual(expectedVectors);
	});

	it("should throw an error for incomplete segment definition", () => {
		const cpu = new Cpu6502Handler();
		const assembler = new Assembler(cpu, mockFileHandler);
		const source = `
      .SEGMENT "INCOMPLETE" { start: 0x1000 }
    `;
		expect(() => assembler.assemble(source)).toThrow("ERROR on line 2: .SEGMENT definition requires 'start' and 'end' parameters.");
	});

	it("should throw an error for invalid end address", () => {
		const cpu = new Cpu6502Handler();
		const assembler = new Assembler(cpu, mockFileHandler);
		const source = `
      .SEGMENT "BAD" { start: 0x2000, end: 0x1000 }
    `;
		expect(() => assembler.assemble(source)).toThrow("ERROR on line 2: .SEGMENT 'end' address must be greater than or equal to 'start' address.");
	});

	it("should handle expressions in segment definitions", () => {
		const cpu = new Cpu6502Handler();
		const assembler = new Assembler(cpu, mockFileHandler);
		const source = `
		  START_ADDR = 0xC000
		  END_ADDR = 0xC00F
		  .SEGMENT "EXPR_SEG" { start: START_ADDR, end: END_ADDR, pad: 2*8 }

		  .SEGMENT EXPR_SEG
		  .BYTE $CA, $FE
		`;

		const segments = assembler.assemble(source);
		const seg = segments.find((s) => s.name === "EXPR_SEG");
		expect(seg).toBeDefined();
		expect(seg?.start).toBe(0xc000);
		expect(seg?.size).toBe(16);
		expect(seg?.padValue).toBe(16);
		expect(seg?.data.slice(0, 2)).toEqual([0xca, 0xfe]);
		expect(seg?.data[2]).toBe(16);
	});
});
