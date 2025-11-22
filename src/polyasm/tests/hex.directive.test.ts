import { describe, expect, it } from "vitest";
import { Assembler, type FileHandler, type SegmentDefinition } from "../polyasm";

class MockFileHandler implements FileHandler {
	readSourceFile(filename: string): string {
		throw new Error(`Mock file not found: "${filename}"`);
	}

	readBinaryFile(filename: string): number[] {
		throw new Error(`Mock bin file not found: ${filename}`);
	}
}

// Minimal fake CPU handler
const fakeCPU = {
	cpuType: "FakeCPU",
	isInstruction: () => false,
	resolveAddressingMode: () => ({
		mode: "",
		opcode: 0,
		bytes: 0,
		resolvedAddress: 0,
	}),
	encodeInstruction: () => [],
	getPCSize: () => 8,
};

const DEFAULT_SEGMENTS: SegmentDefinition[] = [{ name: "CODE", start: 0x1000, size: 0, resizable: true }];

describe(".HEX Directive", () => {
	const createAssembler = (segments: SegmentDefinition[] = DEFAULT_SEGMENTS) => {
		const mockFileHandler = new MockFileHandler();
		return new Assembler(fakeCPU, mockFileHandler, { segments });
	};
	it("should handle .HEX directive with valid inputs", () => {
		const assembler = createAssembler();

		const source = `
            .ORG $1000
            .HEX
                01 02 03 04 ; four bytes
                //05060708    ; four more with no spaces
                05 06 07 08    ; four more with no spaces
            .END

            .HEX { 09 0A 0B 0C } ; inline hex block

            .DB $FF ; separator byte
        `;

		assembler.assemble(source);
		const machineCode = assembler.link();
		expect(machineCode).toEqual([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0xff]);
	});

	it("should throw error for invalid .HEX number", () => {
		const assembler = createAssembler();

		const sourceWithOddDigits = `
            .HEX { 123 }
        `;
		expect(() => assembler.assemble(sourceWithOddDigits)).toThrow("Hex data must have an even number of digits.");
	});

	it("should throw errors for invalid .HEX data", () => {
		const assembler = createAssembler();

		const sourceWithInvalidChars = `
            .HEX { 00 GG 11 }
        `;
		expect(() => assembler.assemble(sourceWithInvalidChars)).toThrow('Invalid hexadecimal character sequence: "GG"');
	});
});
