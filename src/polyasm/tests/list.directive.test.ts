import { describe, expect, it, vi } from "vitest";
import { Logger } from "../logger";
import type { FileHandler } from "../polyasm";
import { Assembler } from "../polyasm";

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
	cpuType: "6502" as const,
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

describe(".LIST Directive", () => {
	it("should disable logging with .LIST OFF", () => {
		const logger = new Logger();
		const assembler = new Assembler(fakeCPU, new MockFileHandler(), { logger });

		const source = `
            .LIST OFF
        `;
		assembler.assemble(source);
		expect(assembler.logger.enabled).toBe(false);
	});

	it("should enable logging with .LIST ON after being disabled", () => {
		const logger = new Logger(false); // Start with logging disabled
		const assembler = new Assembler(fakeCPU, new MockFileHandler(), { logger });

		const source = `
            .LIST ON
        `;
		assembler.assemble(source);
		expect(assembler.logger.enabled).toBe(true);
	});

	it.skip("should suppress log output when disabled and re-enable it", () => {
		const logger = new Logger();
		const assembler = new Assembler(fakeCPU, new MockFileHandler(), { logger });
		const logSpy = vi.spyOn(logger, "log").mockImplementation(() => {});

		const source = `
			Start: .DB 1 ; This should log
			.LIST OFF
			MyLabel: .DB 1 ; This should NOT log
			.LIST ON
			AnotherLabel: .DB 2 ; This should log again
		`;

		assembler.assemble(source);

		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Start"));
		expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining("MyLabel"));
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("AnotherLabel"));

		logSpy.mockRestore();
	});
});
