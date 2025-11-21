import { describe, it, expect, vi } from "vitest";
import { Cpu6502Handler } from "../cpu/cpu6502.class";
import { Assembler, type FileHandler } from "../polyasm";
import { Logger } from "../logger";

class MockFileHandler implements FileHandler {
	readSourceFile(filename: string): string {
		throw new Error(`Mock file not found: "${filename}"`);
	}

	readBinaryFile(filename: string): number[] {
		throw new Error(`Mock bin file not found: ${filename}`);
	}
}

describe("File Directives (.INCLUDE, .INCBIN)", () => {
	const createAssembler = () => {
		const mockFileHandler = new MockFileHandler();
		const logger = new Logger();
		// logger.setLogLevel(Logger.LOG_LEVEL_NONE); // Disable logs for tests
		logger.enabled = false;
		const cpuHandler = new Cpu6502Handler(logger);
		const assembler = new Assembler(cpuHandler, mockFileHandler, logger);
		return { assembler, mockFileHandler, logger };
	};

	describe(".INCLUDE Directive", () => {
		it("should include and assemble a source file", () => {
			const { assembler, mockFileHandler } = createAssembler();
			const includedCode = "LDA #$10\nSTA $0200";
			const source = `
				.INCLUDE "included.asm" ; include this file
				test = 0
			`;

			const readSourceFileSpy = vi.spyOn(mockFileHandler, "readSourceFile").mockReturnValue(includedCode);

			const result = assembler.assemble(source);

			expect(readSourceFileSpy).toHaveBeenCalledWith("included.asm");
			expect(result).toEqual([0xa9, 0x10, 0x8d, 0x00, 0x02]);
		});

		it("should log an error if the file to include is not found", () => {
			const { assembler, mockFileHandler, logger } = createAssembler();
			const source = `.INCLUDE "nonexistent.asm"`;

			const readSourceFileSpy = vi.spyOn(mockFileHandler, "readSourceFile").mockImplementation(() => {
				throw new Error("File not found");
			});
			const loggerErrorSpy = vi.spyOn(logger, "error");

			assembler.assemble(source);

			expect(readSourceFileSpy).toHaveBeenCalledWith("nonexistent.asm");
			expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining("ERROR including file"));
		});

		it("should log an error if .INCLUDE is missing a filename argument", () => {
			const { assembler } = createAssembler();
			const source = ".INCLUDE";

			expect(() => assembler.assemble(source)).toThrow("[PASS 1] ERROR: .INCLUDE requires a string argument");
		});
	});

	describe(".INCBIN Directive", () => {
		it("should include a binary file", () => {
			const { assembler, mockFileHandler } = createAssembler();
			const binaryData = [0x01, 0x02, 0x03, 0x04];
			const source = `
				* = $c000
				.INCBIN "data.bin"
			`;

			const readBinaryFileSpy = vi.spyOn(mockFileHandler, "readBinaryFile").mockReturnValue(binaryData);

			const result = assembler.assemble(source);

			expect(readBinaryFileSpy).toHaveBeenCalledWith("data.bin");
			expect(result).toEqual(binaryData);
		});

		it("should throw an error if the binary file is not found", () => {
			const { assembler, mockFileHandler } = createAssembler();
			const source = `.INCBIN "nonexistent.bin"`;

			const readBinaryFileSpy = vi.spyOn(mockFileHandler, "readBinaryFile").mockImplementation(() => {
				throw new Error("File not found");
			});

			expect(() => assembler.assemble(source)).toThrow("Assembly failed on line 1: Binary include failed.");
			expect(readBinaryFileSpy).toHaveBeenCalledWith("nonexistent.bin");
		});

		it("should log an error if .INCBIN is missing a filename argument", () => {
			const { assembler } = createAssembler();
			const source = ".INCBIN";

			expect(() => assembler.assemble(source)).toThrow("[PASS 1] ERROR: .INCBIN requires a string argument on line 1.");
		});
	});
});
