import { describe, expect, it } from "vitest";
import { Assembler } from "../polyasm";
import type { FileHandler, SegmentDefinition } from "../polyasm.types";

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

describe("Repeat Directives", () => {
	const createAssembler = (segments: SegmentDefinition[] = DEFAULT_SEGMENTS) => {
		const mockFileHandler = new MockFileHandler();
		return new Assembler(fakeCPU, mockFileHandler, { segments });
	};

	it("should repeat N times", () => {
		const assembler = createAssembler();
		const source = `
            .repeat 3 {
                .db 9
            }
        `;
		assembler.assemble(source);
		const machineCode = assembler.link();
		expect(machineCode).toEqual([9, 9, 9]);
	});

	it("should repeat with single line block declaration", () => {
		const assembler = createAssembler();
		const source = ".repeat 2 { .db 5 }";
		assembler.assemble(source);
		const machineCode = assembler.link();

		expect(machineCode).toEqual([5, 5]);
	});

	it("should repeat with an expression as count", () => {
		const assembler = createAssembler();
		const source = ".repeat 1+1 { .db 5 }";
		assembler.assemble(source);
		const machineCode = assembler.link();

		expect(machineCode).toEqual([5, 5]);
	});

	it("should provide a 1-based iterator when requested", () => {
		const assembler = createAssembler();
		const source = `
            .repeat 3 as idx {
                .db idx
            }
        `;
		assembler.assemble(source);
		const machineCode = assembler.link();

		expect(machineCode).toEqual([1, 2, 3]);
	});

	it("iterator should be local to the loop scope", () => {
		const assembler = createAssembler();
		const source = `
            .repeat 2 as idx {
                .db idx
            }
            test = idx
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
