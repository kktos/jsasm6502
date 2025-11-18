import { describe, expect, it } from "vitest";

import { Assembler, type FileHandler } from "./polyasm";
import { Cpu6502Handler } from "./cpu/cpu6502.class";
import { Logger } from "./logger";

describe("Label References", () => {
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

	describe("Nameless Local Labels", () => {
		it("should resolve a simple backward reference (:-)", () => {
			const { evaluator, tokenize, assembler } = setup();
			assembler.anonymousLabels = [0x1000, 0x1004];
			const tokens = tokenize(":-");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0x1008, assembler });
			expect(result).toBe(0x1004);
		});

		it("should resolve a simple forward reference (:+)", () => {
			const { evaluator, tokenize, assembler } = setup();
			assembler.anonymousLabels = [0x1000, 0x1008];
			const tokens = tokenize(":+");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0x1002, assembler });
			expect(result).toBe(0x1008);
		});

		it("should resolve a repeated backward reference (:--)", () => {
			const { evaluator, tokenize, assembler } = setup();
			assembler.anonymousLabels = [0x1000, 0x1004, 0x1008];
			const tokens = tokenize(":--");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0x100a, assembler });
			expect(result).toBe(0x1004);
		});

		it("should resolve a numbered backward reference (:-2)", () => {
			const { evaluator, tokenize, assembler } = setup();
			assembler.anonymousLabels = [0x1000, 0x1004, 0x1008];
			const tokens = tokenize(":-2");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0x100a, assembler });
			expect(result).toBe(0x1004);
		});

		it("should resolve a numbered forward reference (:+2)", () => {
			const { evaluator, tokenize, assembler } = setup();
			assembler.anonymousLabels = [0x1000, 0x1008, 0x1010];
			const tokens = tokenize(":+2");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0x1002, assembler });
			expect(result).toBe(0x1010);
		});

		it("should throw an error for an unsatisfiable backward reference", () => {
			const { evaluator, tokenize, assembler } = setup();
			assembler.anonymousLabels = [0x1000];
			const tokens = tokenize(":-2");
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0x1002, assembler })).toThrow(
				"Not enough preceding anonymous labels to satisfy '-2' on line 1.",
			);
		});

		it("should throw an error for an unsatisfiable forward reference", () => {
			const { evaluator, tokenize, assembler } = setup();
			assembler.anonymousLabels = [0x1008];
			const tokens = tokenize(":+2");
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0x1002, assembler })).toThrow(
				"Not enough succeeding anonymous labels to satisfy '+2' on line 1.",
			);
		});
	});

	describe("Local Labels with different prefixes", () => {
		it("should resolve nameless label with a custom prefix from .OPTION", () => {
			const { assembler } = setup();
			const source = `
				.OPTION local_label_style ":"
				.ORG $1000
				: ; Anonymous label at $1000
				LDA :-
			`;
			const machineCode = assembler.assemble(source);
			expect(machineCode).toEqual([0xad, 0x00, 0x10]); // JMP $1000
		});
	});

	describe("Named Local Labels", () => {
		it("should resolve a named local label within its scope", () => {
			const { assembler } = setup();
			const source = `
				.ORG $1000
				FillMemory:
					LDX #$00
				:loop
					STA $2000,X
					INX
					BNE :loop
					RTS
			`;
			const machineCode = assembler.assemble(source);
			expect(machineCode).toEqual([
				0xa2,
				0x00, // LDX #$00
				0x9d,
				0x00,
				0x20, // STA $2000,X
				0xe8, // INX
				0xd0,
				0xfa, // BNE :loop (to $1002)
				0x60, // RTS
			]);
		});
	});
});
