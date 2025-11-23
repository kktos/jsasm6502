import { describe, expect, it } from "vitest";
import { Assembler } from "../polyasm";
import { type FileHandler, type SegmentDefinition } from "../polyasm.types";

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

describe(".FOR...OF", () => {
	const createAssembler = (segments: SegmentDefinition[] = DEFAULT_SEGMENTS) => {
		const mockFileHandler = new MockFileHandler();
		return new Assembler(fakeCPU, mockFileHandler, { segments });
	};

	it("should loop over an array of numbers", () => {
		const assembler = createAssembler();
		const source = `
				.for item of [10,20] {
					.db item
				}
			`;
		assembler.assemble(source);
		const machineCode = assembler.link();

		expect(machineCode).toEqual([10, 20]);
	});

	it("should loop with single line block declaration", () => {
		const assembler = createAssembler();
		const source = ".for item of [10,20] { .db item }";
		assembler.assemble(source);
		const machineCode = assembler.link();

		expect(machineCode).toEqual([10, 20]);
	});

	it("should loop with iterator", () => {
		const assembler = createAssembler();
		const source = `
				.for item of [10,20] as idx {
					.db idx, item
				}
			`;
		assembler.assemble(source);
		const machineCode = assembler.link();

		expect(machineCode).toEqual([0, 10, 1, 20]);
	});

	it("should loop with single line block declaration with iterator", () => {
		const assembler = createAssembler();
		const source = ".for item of [10,20] as idx { .db idx, item }";
		assembler.assemble(source);
		const machineCode = assembler.link();

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
