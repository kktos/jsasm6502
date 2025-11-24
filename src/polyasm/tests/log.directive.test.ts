import { describe, expect, it } from "vitest";
import { Logger } from "../logger";
import { Assembler } from "../polyasm";

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

function makeAssembler() {
	const logger = new CaptureLogger();
	const asm = new Assembler(fakeCPU, { readSourceFile: () => "", readBinaryFile: () => [] }, { logger });
	return { asm, logger };
}

describe("Logging directives", () => {
	describe(".LOG directive", () => {
		it("logs a single numeric expression", () => {
			const { asm, logger } = makeAssembler();
			const src = ".LOG 1+2";
			asm.assemble(src);

			const found = logger.lines.find((l) => l === "3");
			expect(found).toBeDefined();
		});

		it("logs a expression with function calls", () => {
			const { asm, logger } = makeAssembler();
			const src = `.LOG "var=" + .hex(12,4)`;
			asm.assemble(src);

			// expect(logger.lines).toBe("");

			const found = logger.lines.find((l) => l === "var=$000C");
			expect(found).toBeDefined();
		});

		it("logs multiple comma-separated expressions", () => {
			const { asm, logger } = makeAssembler();
			const src = '.LOG 10, "HELLO", [1,2]';
			asm.assemble(src);

			const found = logger.lines.find((l) => l === "10, HELLO, [1, 2]");
			expect(found).toBeDefined();
		});
	});

	describe(".ERR directive", () => {
		it("log a simple error", () => {
			const { asm } = makeAssembler();
			const src = `.ERR "Boom Bada Boom"`;
			expect(() => asm.assemble(src)).toThrow("[ERROR] Boom Bada Boom");
		});
	});

	describe(".WARN directive", () => {
		it("log a simple warning", () => {
			const { asm, logger } = makeAssembler();
			const src = `.WARN "Boom Bada Boom"`;
			asm.assemble(src);

			// expect(logger.lines).toBe("");

			const found = logger.lines.find((l) => l === "[WARN] Boom Bada Boom");
			expect(found).toBeDefined();
		});
	});
});
