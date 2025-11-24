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

describe("Data Directives", () => {
	const createAssembler = (segments: SegmentDefinition[] = DEFAULT_SEGMENTS) => {
		const mockFileHandler = new MockFileHandler();
		return new Assembler(fakeCPU, mockFileHandler, { segments });
	};

	it("should handle .DB with single and multiple numbers", () => {
		const assembler = createAssembler();
		const source = ".DB 10, 20, $30";
		assembler.assemble(source);
		const machineCode = assembler.link();
		expect(machineCode).toEqual([10, 20, 0x30]);
	});

	it("should handle .BYTE as an alias for .DB", () => {
		const assembler = createAssembler();
		const source = ".BYTE 10, 20, $30";
		assembler.assemble(source);
		const machineCode = assembler.link();
		expect(machineCode).toEqual([10, 20, 0x30]);
	});

	it("should handle .DW with little-endian encoding", () => {
		const assembler = createAssembler();
		const source = ".DW $1234, $5678";
		assembler.assemble(source);
		const machineCode = assembler.link();
		expect(machineCode).toEqual([0x34, 0x12, 0x78, 0x56]);
	});

	it("should handle .WORD as an alias for .DW", () => {
		const assembler = createAssembler();
		const source = ".WORD $1234, $5678";
		assembler.assemble(source);
		const machineCode = assembler.link();
		expect(machineCode).toEqual([0x34, 0x12, 0x78, 0x56]);
	});

	it("should handle .DL with little-endian encoding", () => {
		const assembler = createAssembler();
		const source = ".DL $12345678";
		assembler.assemble(source);
		const machineCode = assembler.link();
		expect(machineCode).toEqual([0x78, 0x56, 0x34, 0x12]);
	});

	it("should handle .LONG as an alias for .DL", () => {
		const assembler = createAssembler();
		const source = ".LONG $12345678";
		assembler.assemble(source);
		const machineCode = assembler.link();
		expect(machineCode).toEqual([0x78, 0x56, 0x34, 0x12]);
	});

	it("should handle a mix of numbers and strings", () => {
		const assembler = createAssembler();
		const source = `.DB "Hello", 13, 10`;
		assembler.assemble(source);
		const machineCode = assembler.link();
		const expected = "Hello".split("").map((c) => c.charCodeAt(0));
		expected.push(13, 10);
		expect(machineCode).toEqual(expected);
	});

	it("should handle expressions as values", () => {
		const assembler = createAssembler();
		const source = `
		.let val = 5
		.DB val * 2, val + 10
		`;
		assembler.assemble(source);
		const machineCode = assembler.link();
		expect(machineCode).toEqual([10, 15]);
	});

	it("should handle forward-referenced expressions in pass two", () => {
		const assembler = createAssembler();
		const source = `
		.DW target
		target: .DB 0
		`;
		assembler.assemble(source);
		const machineCode = assembler.link();
		// The segment starts at 0x1000. The .DW is at 0x1000. 'target' is at 0x1002.
		expect(machineCode).toEqual([0x02, 0x10, 0x00]);
	});
});
