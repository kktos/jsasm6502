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

describe("Repeat Directives", () => {
	const createAssembler = () => {
		const mockFileHandler = new MockFileHandler();
		const logger = new Logger();
		const cpu6502 = new Cpu6502Handler(logger);
		return new Assembler(cpu6502, mockFileHandler);
	};

	it("should repeat N times", () => {
		const assembler = createAssembler();
		const source = `
            .repeat 3 {
                .db 9
            }
        `;
		const machineCode = assembler.assemble(source);

		expect(machineCode).toEqual([9, 9, 9]);
	});

	it("should repeat with single line block declaration", () => {
		const assembler = createAssembler();
		const source = ".repeat 2 { .db 5 }";
		const machineCode = assembler.assemble(source);

		expect(machineCode).toEqual([5, 5]);
	});

	it("should repeat with an expression as count", () => {
		const assembler = createAssembler();
		const source = ".repeat 1+1 { .db 5 }";
		const machineCode = assembler.assemble(source);

		expect(machineCode).toEqual([5, 5]);
	});

	it("should provide a 1-based iterator when requested", () => {
		const assembler = createAssembler();
		const source = `
            .repeat 3 as idx {
                .db idx
            }
        `;
		const machineCode = assembler.assemble(source);

		expect(machineCode).toEqual([1, 2, 3]);
	});

	it("iterator should be local to the loop scope", () => {
		const assembler = createAssembler();
		const source = `
            .repeat 2 as idx {
                .db idx
            }
            test .equ idx
        `;

		expect(() => assembler.assemble(source)).toThrow(/Undefined symbol 'IDX'/);
	});

	it("can't repeat a negative count", () => {
		const assembler = createAssembler();
		const source = `
            .repeat -1 as idx {
                .db idx
            }
            test .equ idx
        `;

		expect(() => assembler.assemble(source)).toThrow(/Repeat count must be a positive integer./);
	});
});
