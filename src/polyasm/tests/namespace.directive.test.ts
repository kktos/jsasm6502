import { describe, expect, it } from "vitest";
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

describe(".NAMESPACE Directive", () => {
	const createAssembler = () => {
		const mockFileHandler = new MockFileHandler();
		const logger = new CaptureLogger();
		const assembler = new Assembler(fakeCPU, mockFileHandler, logger);
		return { assembler, mockFileHandler, logger };
	};

	it("should switch current namespace when given an identifier", () => {
		const { assembler } = createAssembler();
		const source = ".NAMESPACE myns\n";

		assembler.assemble(source);

		// Identifiers are uppercased by the lexer
		expect(assembler.symbolTable.getCurrentNamespace()).toBe("MYNS");
	});

	// it("should log an error when missing the namespace argument", () => {
	// 	const { assembler, logger } = createAssembler();
	// 	const spy = vi.spyOn(logger, "error").mockImplementation(() => {});

	// 	assembler.assemble(".NAMESPACE");

	// 	expect(spy).toHaveBeenCalledWith(expect.stringContaining(".NAMESPACE directive requires an argument"));
	// 	spy.mockRestore();
	// });

	it("should update namespace on successive directives", () => {
		const { assembler } = createAssembler();
		const source = ".NAMESPACE one\n.NAMESPACE two\n";

		assembler.assemble(source);

		expect(assembler.symbolTable.getCurrentNamespace()).toBe("TWO");
	});

	it("should pop the NS when .end is encountered", () => {
		const { assembler, logger } = createAssembler();
		const source = `
			.echo .PASS + "NS>> global:", .NAMESPACE

			.NAMESPACE one
			.echo .PASS + "NS>> one:", .NAMESPACE
			.end NAMESPACE

			.echo .PASS + "NS>> global:", .NAMESPACE

			.NAMESPACE two
			.echo .PASS + "NS>> two:", .NAMESPACE

			.NAMESPACE
			.echo .PASS + "NS>> global:", .NAMESPACE
		`;

		assembler.assemble(source);

		expect(logger.lines.filter((l) => l.startsWith("1NS>> "))).toEqual([
			"1NS>> global:, global",
			"1NS>> one:, ONE",
			"1NS>> global:, global",
			"1NS>> two:, TWO",
			"1NS>> global:, global",
		]);
	});

	it("should update namespace on successive directives", () => {
		const { assembler, logger } = createAssembler();
		const source = `
			.NAMESPACE vars
			one = 45
			.END NAMESPACE

			one = 56

			.echo ">>", vars::one, one

		`;

		assembler.assemble(source);

		expect(logger.lines.filter((l) => l.startsWith(">>"))).toEqual([">>, 45, 56", ">>, 45, 56"]);
	});
});
