import { describe, expect, it } from "vitest";
import { Cpu6502Handler } from "../cpu/cpu6502.class";
import type { Token } from "../lexer/lexer.class";
import { Logger } from "../logger";
import { Assembler, type FileHandler } from "../polyasm";

describe("Macro Handling", () => {
	const setup = () => {
		class MockFileHandler implements FileHandler {
			readSourceFile(filename: string): string {
				throw new Error(`Mock file not found: "${filename}"`);
			}
			readBinaryFile(filename: string): number[] {
				throw new Error(`Mock bin file not found: ${filename}`);
			}
		}
		const logger = new Logger();
		const assembler = new Assembler(new Cpu6502Handler(logger), new MockFileHandler(), logger);
		const { symbolTable, expressionEvaluator: evaluator, lexer } = assembler;
		const tokenize = (expr: string) => lexer.tokenize(expr).filter((t) => t.type !== "EOF");
		return { assembler, symbolTable, evaluator, lexer, tokenize };
	};

	describe("Macro Argument Evaluation", () => {
		it("should resolve a simple numeric macro argument in an expression", () => {
			const { evaluator, tokenize } = setup();
			const macroArgs = new Map<string, Token[]>();
			macroArgs.set("MY_ARG", tokenize("10"));

			const tokens = tokenize("MY_ARG * 2");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0, macroArgs });
			expect(result).toBe(20);
		});

		it("should resolve a macro argument that is itself an expression", () => {
			const { evaluator, tokenize, symbolTable } = setup();
			symbolTable.define("FIVE", 5);
			const macroArgs = new Map<string, Token[]>();
			// The argument passed to the macro is "FIVE + 5"
			macroArgs.set("COMPLEX_ARG", tokenize("FIVE + 5"));

			// The expression inside the macro is "COMPLEX_ARG / 2"
			const tokens = tokenize("COMPLEX_ARG / 2");
			// Expected: (5 + 5) / 2 = 5
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0, macroArgs });
			expect(result).toBe(5);
		});

		it("should perform a full macro expansion with argument substitution", () => {
			const { assembler, symbolTable } = setup();

			// Define a simple macro
			assembler.assemble(`.MACRO MY_MACRO(arg1, arg2)
				LDA #arg1
				STA $2000
				LDA #arg2
				STA $2001
				.END`);

			// Now, use the macro
			const source = "MY_MACRO(10, 20)";
			assembler.assemble(source);

			// Check if the symbols are defined correctly after macro expansion
			expect(symbolTable.lookupSymbol("arg1")).toBeUndefined(); // Macro arguments should not leak into the symbol table
			expect(symbolTable.lookupSymbol("arg2")).toBeUndefined();
		});

		it("tests a c-like macro with no parameters", () => {
			const { assembler } = setup();
			const src = `
				.macro nopnopnop
					nop
					nop
					nop
				.end

				start:
					nopnopnop
			`;
			const machineCode6502 = assembler.assemble(src);

			expect(machineCode6502).toEqual([0xea, 0xea, 0xea]);
		});

		it("should raise an error for a macro with extra parameters", () => {
			const { assembler } = setup();
			const src = `
				.macro nopnopnop
					nop
					nop
					nop
				.end

				start:
					nopnopnop 98
			`;
			expect(() => assembler.assemble(src)).toThrow("[PASS 2] Too many arguments for macro 'NOPNOPNOP' on line 9. Expected 0, but got 1.");
		});

		it("tests macro with strings", () => {
			const { assembler } = setup();
			const src = `
				.macro log fmt, parm1
					.db $42,$FF
					.cstr fmt
					.db 1
					.dw parm1
				.end

				.org $1000
				mem:
				log "ABCD", mem
			`;
			const machineCode6502 = assembler.assemble(src);
			expect(machineCode6502).toEqual([0x42, 0xff, 0x41, 0x42, 0x43, 0x44, 0x00, 0x01, 0x00, 0x10]);
		});
	});
});
