import { describe, expect, it } from "vitest";
import { Assembler, type FileHandler } from "../polyasm";
import { Cpu6502Handler } from "./cpu6502.class";

const mockFileHandler: FileHandler = {
	readSourceFile: (_filename: string) => "",
	readBinaryFile: (_filename: string) => [],
};

describe("Polymer Assembler - 6502 Opcodes", () => {
	const assembleAndGetCode = (source: string): number[] => {
		const cpu = new Cpu6502Handler();
		const assembler = new Assembler(cpu, mockFileHandler, {
			segments: [{ name: "CODE", start: 0x8000, size: 0x1000, padValue: 0 }],
		});
		const segments = assembler.assemble(source);
		const codeSegment = segments.find((s) => s.name === "CODE");
		// Only return the part of the data that has been written to
		return codeSegment?.data.slice(0, assembler.currentPC - codeSegment.start) ?? [];
	};

	it("should assemble ADC instructions", () => {
		const source = `
            ADC #$10
            ADC $20
            ADC $30,X
            ADC $1234
            ADC $1234,X
            ADC $1234,Y
            ADC ($40,X)
            ADC ($50),Y
        `;
		const data = assembleAndGetCode(source);
		expect(data).toEqual([
			0x69,
			0x10, // IMMEDIATE
			0x65,
			0x20, // ZEROPAGE
			0x75,
			0x30, // ZEROPAGE_X
			0x6d,
			0x34,
			0x12, // ABSOLUTE
			0x7d,
			0x34,
			0x12, // ABSOLUTE_X
			0x79,
			0x34,
			0x12, // ABSOLUTE_Y
			0x61,
			0x40, // INDIRECT_X
			0x71,
			0x50, // INDIRECT_Y
		]);
	});

	it("should assemble ASL and ROL instructions with Accumulator addressing", () => {
		const source = `
            ASL A
            ROL A
        `;
		const data = assembleAndGetCode(source);
		expect(data).toEqual([0x0a, 0x2a]);
	});

	it("should assemble JMP indirect", () => {
		const source = "JMP ($1234)";
		const data = assembleAndGetCode(source);
		expect(data).toEqual([0x6c, 0x34, 0x12]);
	});

	it("should assemble various implied instructions", () => {
		const source = `
            CLC
            SEC
            CLI
            SEI
            CLD
            SED
            CLV
            TAX
            TAY
            TSX
            TXA
            TXS
            TYA
        `;
		const data = assembleAndGetCode(source);
		expect(data).toEqual([0x18, 0x38, 0x58, 0x78, 0xd8, 0xf8, 0xb8, 0xaa, 0xa8, 0xba, 0x8a, 0x9a, 0x98]);
	});

	it("should assemble branch instructions", () => {
		const source = `
            START:
                BPL START
                BMI START
                BVC START
                BVS START
                BCC START
                BCS START
                BNE START
                BEQ START
        `;
		const data = assembleAndGetCode(source);
		// Offsets are calculated from the address of the instruction following the branch.
		// PC for BPL is 0x8000. Next instruction is at 0x8002. Target is 0x8000. Offset is 0x8000 - 0x8002 = -2 = 0xFE
		// PC for BMI is 0x8002. Next is 0x8004. Target is 0x8000. Offset is 0x8000 - 0x8004 = -4 = 0xFC
		// ...and so on
		expect(data).toEqual([
			0x10,
			0xfe, // BPL
			0x30,
			0xfc, // BMI
			0x50,
			0xfa, // BVC
			0x70,
			0xf8, // BVS
			0x90,
			0xf6, // BCC
			0xb0,
			0xf4, // BCS
			0xd0,
			0xf2, // BNE
			0xf0,
			0xf0, // BEQ
		]);
	});
});
