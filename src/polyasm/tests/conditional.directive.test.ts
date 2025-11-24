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

describe("Conditional Directives", () => {
	const createAssembler = (segments: SegmentDefinition[] = DEFAULT_SEGMENTS) => {
		const mockFileHandler = new MockFileHandler();
		return new Assembler(fakeCPU, mockFileHandler, { segments });
	};

	describe("Conditional Source", () => {
		it("should error if .IF is true", () => {
			const assembler = createAssembler();
			const source = `
			.if 1
				.error "Should Error"
			.end
			`;
			expect(() => assembler.assemble(source)).toThrow("[ERROR] Should Error");
		});

		it("should not error if .IF is false", () => {
			const assembler = createAssembler();
			const source = `
			.if 0
				.error "Should Error"
			.end
			`;
			assembler.assemble(source);
		});
	});

	describe("Assembling", () => {
		it("should assemble block if .IF is true", () => {
			const assembler = createAssembler();
			const source = `
      .if 1
        .db $AA
      .end
    `;
			assembler.assemble(source);
			const machineCode = assembler.link();
			expect(machineCode).toEqual([0xaa]);
		});

		it("should not assemble block if .IF is false", () => {
			const assembler = createAssembler();
			const source = `
      .if 0
        .db $AA
      .end
    `;
			assembler.assemble(source);
			const machineCode = assembler.link();
			expect(machineCode).toEqual([]);
		});

		it("should handle .IF/.ELSE, with .IF being true", () => {
			const assembler = createAssembler();
			const source = `
      .if 1
        .db $AA
      .else
        .db $BB
      .end
    `;
			assembler.assemble(source);
			const machineCode = assembler.link();
			expect(machineCode).toEqual([0xaa]);
		});

		it("should handle .IF/.ELSE, with .IF being false", () => {
			const assembler = createAssembler();
			const source = `
      .if 0
        .db $AA
      .else
        .db $BB
      .end
    `;
			assembler.assemble(source);
			const machineCode = assembler.link();
			expect(machineCode).toEqual([0xbb]);
		});

		it("should handle .IF/.ELSEIF/.ELSE, with .IF true", () => {
			const assembler = createAssembler();
			const source = `
      .if 1
        .db $AA
      .elseif 1
        .db $CC
      .else
        .db $BB
      .end
    `;
			assembler.assemble(source);
			const machineCode = assembler.link();
			expect(machineCode).toEqual([0xaa]);
		});

		it("should handle .IF/.ELSEIF/.ELSE, with .ELSEIF true", () => {
			const assembler = createAssembler();
			const source = `
      .if 0
        .db $AA
      .elseif 1
        .db $CC
      .else
        .db $BB
      .end
    `;
			assembler.assemble(source);
			const machineCode = assembler.link();
			expect(machineCode).toEqual([0xcc]);
		});

		it("should handle .IF/.ELSEIF/.ELSE, with .ELSE true", () => {
			const assembler = createAssembler();
			const source = `
      .if 0
        .db $AA
      .elseif 0
        .db $CC
      .else
        .db $BB
      .end
    `;
			assembler.assemble(source);
			const machineCode = assembler.link();
			expect(machineCode).toEqual([0xbb]);
		});

		it("should handle nested .IF blocks", () => {
			const assembler = createAssembler();
			const source = `
      .if 1
        .db $AA
        .if 0
          .db $DD
        .else
          .db $EE
        .end
        .db $BB
      .end
    `;
			assembler.assemble(source);
			const machineCode = assembler.link();
			expect(machineCode).toEqual([0xaa, 0xee, 0xbb]);
		});

		it("should handle forward-referenced symbols in conditions if size is consistent", () => {
			const assembler = createAssembler();
			const source = `
      .if val == 10
        .db $AA
      .else
        .db $BB
      .end
      val = 10
    `;
			assembler.assemble(source);
			const machineCode = assembler.link();
			expect(machineCode).toEqual([0xaa]);
		});

		it("should be able to compute the right size even with forward-referenced symbols", () => {
			const assembler = createAssembler();
			const source = `
      .if val == 10
        .db $AA, $AA
      .else
        .db $BB
      .end
      val = 10
      target: .db $FF
    `;

			assembler.assemble(source);
			const machineCode = assembler.link();
			expect(machineCode).toEqual([0xaa, 0xaa, 0xff]);
		});
	});
});
