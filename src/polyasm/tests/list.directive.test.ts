import { describe, expect, it, vi } from "vitest";
import { Cpu6502Handler } from "../cpu/cpu6502.class";
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

describe(".LIST Directive", () => {
	it("should disable logging with .LIST OFF", () => {
		const logger = new Logger();
		const cpu6502 = new Cpu6502Handler(logger);
		const assembler = new Assembler(cpu6502, new MockFileHandler(), logger);

		const source = `
            .LIST OFF
        `;
		assembler.assemble(source);
		expect(assembler.logger.enabled).toBe(false);
	});

	it("should enable logging with .LIST ON after being disabled", () => {
		const logger = new Logger(false); // Start with logging disabled
		const cpu6502 = new Cpu6502Handler(logger);
		const assembler = new Assembler(cpu6502, new MockFileHandler(), logger);

		const source = `
            .LIST ON
        `;
		assembler.assemble(source);
		expect(assembler.logger.enabled).toBe(true);
	});

	it.skip("should suppress log output when disabled and re-enable it", () => {
		const logger = new Logger();
		const cpu6502 = new Cpu6502Handler(logger);
		const assembler = new Assembler(cpu6502, new MockFileHandler(), logger);
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
