import { describe, expect, it, vi } from "vitest";
import type { DirectiveContext } from "../directives/directive.interface";
import { Assembler } from "../polyasm";
import type { FileHandler, SegmentDefinition } from "../polyasm.types";
import type { SymbolValue } from "../symbol.class";

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

describe(".DEFINE Directive", () => {
	const createAssembler = (
		defineSymbolHandlers: Map<string, (blockContent: string, context: DirectiveContext) => SymbolValue>,
		segments: SegmentDefinition[] = DEFAULT_SEGMENTS,
	) => {
		const mockFileHandler = new MockFileHandler();
		return new Assembler(fakeCPU, mockFileHandler, { segments, rawDataProcessors: defineSymbolHandlers });
	};

	it("should call the external handler and define the symbol", () => {
		// 1. Create a mock handler function
		const textHandler = vi.fn((blockContent: string, _context: DirectiveContext) => blockContent);
		const handlers = new Map([["text", textHandler]]);

		// 2. Create assembler with the handler
		const assembler = createAssembler(handlers);

		// 3. Assemble source with the .DEFINE directive
		const source = `
            .DEFINE MY_SYMBOL
                This is some complex data
                that the handler will process.
            .END
        `;
		assembler.assemble(source);

		// 5. Verify the symbol was defined with the handler's return value
		const symbolValue = assembler.symbolTable.lookupSymbol("MY_SYMBOL");
		expect(symbolValue).toBe(`                This is some complex data
                that the handler will process.`);
	});

	it("should throw an error for a duplicate symbol definition", () => {
		const assembler = createAssembler(new Map());
		const source = `
			.DEFINE MY_SYMBOL
			.END
			.DEFINE MY_SYMBOL
			.END
		`;
		expect(() => assembler.assemble(source)).toThrow("[PASS 1] ERROR: PASymbol global::MY_SYMBOL redefined.");
	});

	it("should throw an error for an unknown handler", () => {
		const assembler = createAssembler(new Map());
		const source = `
			.DEFINE MY_SYMBOL AS TOML
			.END
		`;
		expect(() => assembler.assemble(source)).toThrow("'.DEFINE' directive on line 2; unknown Data Processor 'TOML'.");
	});

	it("should return a text with a TEXT processor", () => {
		const textHandler = vi.fn((blockContent: string, _context: DirectiveContext) => blockContent);
		const handlers = new Map([["TEXT", textHandler]]);
		const assembler = createAssembler(handlers);

		const source = `
			.DEFINE MY_SYMBOL AS TEXT
			toto
			.END
		`;
		assembler.assemble(source);

		const symbolValue = assembler.symbolTable.lookupSymbol("MY_SYMBOL");
		expect(symbolValue?.toString().trim()).toBe("toto");
	});

	it("should return an object with a JSON processor", () => {
		const jsonHandler = vi.fn((blockContent: string, _context: DirectiveContext) => JSON.parse(blockContent));
		const handlers = new Map([["JSON", jsonHandler]]);
		const assembler = createAssembler(handlers);

		const source = `
			.DEFINE MY_SYMBOL AS JSON
			{
				"name": "tata"
			}
			.END
		`;
		assembler.assemble(source);

		const symbolValue = assembler.symbolTable.lookupSymbol("MY_SYMBOL");
		expect(symbolValue).toEqual({ name: "tata" });
	});

	it("should return an object with a JSON processor", () => {
		const jsonHandler = vi.fn((blockContent: string, _context: DirectiveContext) => JSON.parse(blockContent));
		const handlers = new Map([["JSON", jsonHandler]]);
		const assembler = createAssembler(handlers);

		const source = `
			.DEFINE list AS JSON
			{
				"count": 16
			}
			.END
			.db list.count
		`;
		assembler.assemble(source);
		const machineCode = assembler.link();
		expect(machineCode).toEqual([16]);
	});
});
