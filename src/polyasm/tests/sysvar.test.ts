import { describe, expect, it } from "vitest";
import { Logger } from "../logger";
import { Assembler } from "../polyasm";
import type { FileHandler } from "../polyasm.types";

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

class CaptureLogger extends Logger {
	public lines: string[] = [];
	constructor() {
		super(true);
	}
	log(message: string): void {
		this.lines.push(message);
	}
	warn(message: string): void {
		this.lines.push(`[WARN] ${message}`);
	}
	error(message: string): void {
		this.lines.push(`[ERROR] ${message}`);
	}
}

describe("System Variables", () => {
	const setup = () => {
		class MockFileHandler implements FileHandler {
			readSourceFile(filename: string): string {
				throw new Error(`Mock file not found: "${filename}"`);
			}
			readBinaryFile(filename: string): number[] {
				throw new Error(`Mock bin file not found: ${filename}`);
			}
		}
		const logger = new CaptureLogger();
		const assembler = new Assembler(fakeCPU, new MockFileHandler(), { logger });
		const { symbolTable, expressionEvaluator: evaluator, lexer } = assembler;
		const tokenize = (expr: string) => lexer.tokenize(expr).filter((t) => t.type !== "EOF");
		return { assembler, symbolTable, evaluator, lexer, tokenize, logger };
	};

	it("should evaluate .NAMESPACE to the current namespace", () => {
		const { assembler, evaluator, tokenize } = setup();
		const tokens = tokenize(".NAMESPACE");
		const result = evaluator.evaluate(tokens, { pc: 0, pass: 1, segment: assembler.linker.currentSegment });
		expect(result).toBe("global");
	});

	it("should evaluate .NS as an alias for .NAMESPACE", () => {
		const { assembler, evaluator, tokenize } = setup();
		const tokens = tokenize(".NS");
		const result = evaluator.evaluate(tokens, { pc: 0, segment: assembler.linker.currentSegment });
		expect(result).toBe("global");
	});

	it("should evaluate .PC to the current Program Counter", () => {
		const { assembler, evaluator, tokenize } = setup();
		const tokens = tokenize(".PC");
		const result = evaluator.evaluate(tokens, { pc: 1000, segment: assembler.linker.currentSegment });
		expect(result).toBe(1000);
	});

	it("should evaluate .PASS to the current assembly pass number", () => {
		const { assembler, evaluator, tokenize } = setup();
		const tokens = tokenize(".PASS");
		assembler.pass = 1;
		const result1 = evaluator.evaluate(tokens, { pc: 0, pass: 1, segment: assembler.linker.currentSegment });
		expect(result1).toBe(1);
		assembler.pass = 2;
		const result2 = evaluator.evaluate(tokens, { pc: 0, pass: 2, segment: assembler.linker.currentSegment });
		expect(result2).toBe(2);
	});
});
