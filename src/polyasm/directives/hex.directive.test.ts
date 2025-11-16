import { describe, expect, it } from "vitest";
import { Cpu6502Handler } from "../cpu/cpu6502.class";
import { Assembler } from "../polyasm";
import type { FileHandler } from "../polyasm";

class MockFileHandler implements FileHandler {
	readSourceFile(filename: string): string {
		throw new Error(`Mock file not found: "${filename}"`);
	}

	readBinaryFile(filename: string): number[] {
		throw new Error(`Mock bin file not found: ${filename}`);
	}
}

describe(".HEX Directive", () => {
	it("should handle .HEX directive with valid inputs", () => {
		const mockFileHandler = new MockFileHandler();
		const cpu6502 = new Cpu6502Handler();
		const assembler = new Assembler(cpu6502, mockFileHandler);

		const source = `
            .ORG $1000
            .HEX
                01 02 03 04 ; four bytes
                05060708    ; four more with no spaces
            .END

            .HEX { 09 0A 0B 0C } ; inline hex block

            .DB $FF ; separator byte
        `;

		const machineCode = assembler.assemble(source);
		expect(machineCode).toEqual([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0xff]);
	});

	it("should throw error for invalid .HEX number", () => {
		const mockFileHandler = new MockFileHandler();
		const cpu6502 = new Cpu6502Handler();
		const assembler = new Assembler(cpu6502, mockFileHandler);

		const sourceWithOddDigits = `
            .HEX { 123 }
        `;
		expect(() => assembler.assemble(sourceWithOddDigits)).toThrow("Hex data must have an even number of digits.");

	});

	it("should throw errors for invalid .HEX data", () => {
		const mockFileHandler = new MockFileHandler();
		const cpu6502 = new Cpu6502Handler();
		const assembler = new Assembler(cpu6502, mockFileHandler);

		const sourceWithInvalidChars = `
            .HEX { 00 GG 11 }
        `;
		expect(() => assembler.assemble(sourceWithInvalidChars)).toThrow('Invalid hexadecimal character sequence: "GG"');
	});
});
