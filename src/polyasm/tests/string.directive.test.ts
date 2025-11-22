import { describe, expect, it } from "vitest";
import { Cpu6502Handler } from "../cpu/cpu6502.class";
import { Logger } from "../logger";
import { Assembler, type FileHandler } from "../polyasm";

class MockFileHandler implements FileHandler {
	readSourceFile(filename: string): string {
		throw new Error(`Mock file not found: "${filename}"`);
	}

	readBinaryFile(filename: string): number[] {
		throw new Error(`Mock bin file not found: ${filename}`);
	}
}

describe("String Directives", () => {
	const createAssembler = () => {
		const mockFileHandler = new MockFileHandler();
		const logger = new Logger();
		const cpu6502 = new Cpu6502Handler(logger);
		return new Assembler(cpu6502, mockFileHandler);
	};

	it("should handle .TEXT directive with single and multiple strings", () => {
		const assembler = createAssembler();
		const source = `
            .TEXT "HELLO", " WORLD"
        `;
		const machineCode = assembler.assemble(source);
		const expected = "HELLO WORLD".split("").map((c) => c.charCodeAt(0));
		expect(machineCode).toEqual(expected);
	});

	it("should handle .CSTR directive and its aliases (.CSTRING, .ASCIIZ)", () => {
		const assembler = createAssembler();
		const source = `
			.CSTRING "C2"
            .CSTR "C1"
            .ASCIIZ "C3"
        `;
		const machineCode = assembler.assemble(source);
		expect(machineCode).toEqual([
			0x43,
			0x32,
			0x00, // "C2" + null
			0x43,
			0x31,
			0x00, // "C1" + null
			0x43,
			0x33,
			0x00, // "C3" + null
		]);
	});

	it("should handle .PSTR directive for Pascal-style strings", () => {
		const assembler = createAssembler();
		const source = `
            .PSTR "Pascal", ""
        `;
		const machineCode = assembler.assemble(source);
		expect(machineCode).toEqual([
			0x06,
			0x50,
			0x61,
			0x73,
			0x63,
			0x61,
			0x6c, // len("Pascal") + "Pascal"
			0x00, // len("")
		]);
	});

	it("should handle .PSTRL directive for long Pascal-style strings", () => {
		const assembler = createAssembler();
		const source = `
            .PSTRL "Long Pascal"
        `;
		const machineCode = assembler.assemble(source);
		expect(machineCode).toEqual([
			0x0b,
			0x00,
			0x4c,
			0x6f,
			0x6e,
			0x67,
			0x20,
			0x50,
			0x61,
			0x73,
			0x63,
			0x61,
			0x6c, // 11 (little-endian) + "Long Pascal"
		]);
	});

	it("should throw an error if a non-string expression is provided", () => {
		const assembler = createAssembler();
		const source = `
            .TEXT 12345
        `;
		expect(() => assembler.assemble(source)).toThrow("Data directive expression must evaluate to a string on line 2.");
	});

	it("should throw an error for .PSTR string exceeding 255 bytes", () => {
		const assembler = createAssembler();
		const longString = "A".repeat(256);
		const source = `
            .PSTR "${longString}"
        `;
		expect(() => assembler.assemble(source)).toThrow(".PSTR string length cannot exceed 255 bytes on line 2.");
	});

	it("should correctly calculate size in Pass 1", () => {
		const assembler = createAssembler();
		const source = `
			Start:
				.TEXT "ABC"      ; 3 bytes
				.CSTR "DEF"      ; 4 bytes
				.PSTR "GHI"      ; 4 bytes
				.PSTRL "JKL"     ; 5 bytes
			End:
				.DB 0
		`;
		assembler.assemble(source);
		const startAddress = assembler.symbolTable.lookupSymbol("Start");
		expect(startAddress).toBe(0);
		const endAddress = assembler.symbolTable.lookupSymbol("End");
		expect(endAddress).toBe(16);
		const totalSize = (endAddress as number) - (startAddress as number);
		expect(totalSize).toBe(3 + 4 + 4 + 5);
	});

	it("should handle escape sequences correctly", () => {
		const assembler = createAssembler();
		const source = `
            .TEXT "Line 1\\nLine 2\\tTabbed\\rReturn'\\"Quote\\x21\\\\"
        `;
		const machineCode = assembler.assemble(source);
		const expectedString = "Line 1\nLine 2\tTabbed\rReturn'\"Quote!\\";
		const expected = expectedString.split("").map((c) => c.charCodeAt(0));
		expect(machineCode).toEqual(expected);
	});
});
