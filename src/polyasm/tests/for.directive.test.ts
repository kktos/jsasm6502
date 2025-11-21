import { describe, expect, it } from "vitest";
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

describe(".FOR...OF", () => {
	const createAssembler = () => {
		const mockFileHandler = new MockFileHandler();
		const logger = new Logger();
		const cpu6502 = new Cpu6502Handler(logger);
		return new Assembler(cpu6502, mockFileHandler);
	};

	it("should loop over an array of numbers", () => {
		const assembler = createAssembler();
		const source = `
				.for item of [10,20] {
					.db item
				}
			`;
		const machineCode = assembler.assemble(source);

		expect(machineCode).toEqual([10, 20]);
	});

	it("should loop with single line block declaration", () => {
		const assembler = createAssembler();
		const source = ".for item of [10,20] { .db item }";
		const machineCode = assembler.assemble(source);

		expect(machineCode).toEqual([10, 20]);
	});

	it("should loop with iterator", () => {
		const assembler = createAssembler();
		const source = `
				.for item of [10,20] as idx {
					.db idx, item
				}
			`;
		const machineCode = assembler.assemble(source);

		expect(machineCode).toEqual([0, 10, 1, 20]);
	});

	it("should loop with single line block declaration with iterator", () => {
		const assembler = createAssembler();
		const source = ".for item of [10,20] as idx { .db idx, item }";
		const machineCode = assembler.assemble(source);

		expect(machineCode).toEqual([0, 10, 1, 20]);
	});

	it("should declare a local index iterator variable", () => {
		const assembler = createAssembler();
		const source = `
				.for item of [10,20] as idx {
					.db idx, item
				}
				test .equ idx
			`;
		expect(() => assembler.assemble(source)).toThrow("Undefined symbol 'IDX' on line 5.");
	});

	it("should declare a local iterator variable", () => {
		const assembler = createAssembler();
		const source = `
				.for item of [10,20] as idx {
					.db idx, item
				}
				test .equ item
			`;
		expect(() => assembler.assemble(source)).toThrow("Undefined symbol 'ITEM' on line 5.");
	});
});
