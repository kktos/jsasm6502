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

describe(".ALIGN", () => {
	const createAssembler = (segments: SegmentDefinition[]) => {
		const mockFileHandler = new MockFileHandler();
		return new Assembler(fakeCPU, mockFileHandler, { segments });
	};

	it("should align the PC to the next boundary", () => {
		const segments = [{ name: "CODE", start: 0x1001, size: 0, resizable: true }];
		const assembler = createAssembler(segments);
		const source = `
      .org $1001
      .align 4
      .byte $FF
    `;
		assembler.assemble(source);
		const machineCode = assembler.link();
		const finalPC = assembler.currentPC;

		expect(machineCode).toEqual([0, 0, 0, 0xFF]);
		expect(finalPC).toBe(0x1005);
	});

	it("should align with a custom fill value", () => {
		const segments = [{ name: "CODE", start: 0x1001, size: 0, resizable: true }];
		const assembler = createAssembler(segments);
		const source = `
      .org $1001
      .align 4, $AB
      .byte $FF
    `;
		assembler.assemble(source);
		const machineCode = assembler.link();
		const finalPC = assembler.currentPC;

		expect(machineCode).toEqual([0xAB, 0xAB, 0xAB, 0xFF]);
		expect(finalPC).toBe(0x1005);
	});

	it("should not add padding if already aligned", () => {
		const segments = [{ name: "CODE", start: 0x1004, size: 0, resizable: true }];
		const assembler = createAssembler(segments);
		const source = `
      .org $1004
      .align 4
      .byte $FF
    `;
		assembler.assemble(source);
		const machineCode = assembler.link();
		const finalPC = assembler.currentPC;

		expect(machineCode).toEqual([0xFF]);
		expect(finalPC).toBe(0x1005);
	});

	it("should handle expressions for boundary and fill value", () => {
		const segments = [{ name: "CODE", start: 0x1001, size: 0, resizable: true }];
		const assembler = createAssembler(segments);
		const source = `
      .let boundary = 8
      .let fill = $CC
      .org $1001
      .align boundary, fill
      .byte $FF
    `;
		assembler.assemble(source);
		const machineCode = assembler.link();
		const finalPC = assembler.currentPC;

		// from 1001 to 1008 is 7 bytes
		expect(machineCode).toEqual([0xCC, 0xCC, 0xCC, 0xCC, 0xCC, 0xCC, 0xCC, 0xFF]);
		expect(finalPC).toBe(0x1009);
	});

	it("should warn on non-power-of-two boundary", () => {
		const segments = [{ name: "CODE", start: 0x1001, size: 0, resizable: true }];
		const assembler = createAssembler(segments);
		const source = `
      .org $1001
      .align 3
    `;
		assembler.assemble(source);
		const logs = assembler.logger.getLogs();
		expect(logs.warnings.length).toBe(1);
		expect(logs.warnings[0]).toContain("not a power of two");
	});
});