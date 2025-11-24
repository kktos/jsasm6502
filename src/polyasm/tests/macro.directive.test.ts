import { describe, expect, it } from "vitest";
import { Cpu6502Handler } from "../cpu/cpu6502.class";
import type { Token } from "../lexer/lexer.class";
import { Logger } from "../logger";
import { Assembler } from "../polyasm";
import type { FileHandler, SegmentDefinition } from "../polyasm.types";

const DEFAULT_SEGMENTS: SegmentDefinition[] = [{ name: "CODE", start: 0x1000, size: 0, resizable: true }];

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
		const assembler = new Assembler(new Cpu6502Handler(), new MockFileHandler(), { logger, segments: DEFAULT_SEGMENTS });
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

			const machineCode6502 = assembler.link();
			expect(machineCode6502).toEqual([0xa9, 0x0a, 0x8d, 0x00, 0x20, 0xa9, 0x14, 0x8d, 0x01, 0x20]);

			// Check if the symbols are defined correctly after macro expansion
			expect(symbolTable.lookupSymbol("arg1")).toBeUndefined(); // Macro arguments should not leak into the symbol table
			expect(symbolTable.lookupSymbol("arg2")).toBeUndefined();
		});

		it("should perform a full argument substitution", () => {
			const { assembler, symbolTable } = setup();

			// Define a simple macro
			assembler.assemble(`
				.MACRO MY_MACRO arg1, arg2
					LDA arg1
					STA $2000
					LDA arg2
					STA $2001
				.END
			`);

			// Now, use the macro
			const source = "MY_MACRO #$10, $300";
			assembler.assemble(source);

			const machineCode6502 = assembler.link();
			expect(machineCode6502).toEqual([0xa9, 0x10, 0x8d, 0x00, 0x20, 0xad, 0x0, 0x3, 0x8d, 0x01, 0x20]);

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
			assembler.assemble(src);
			const machineCode6502 = assembler.link();

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
			assembler.assemble(src);
			const machineCode6502 = assembler.link();

			expect(machineCode6502).toEqual([0x42, 0xff, 0x41, 0x42, 0x43, 0x44, 0x00, 0x01, 0x00, 0x10]);
		});
	});

	describe("Macro and Namespace", () => {
		it("should resolve a simple numeric macro argument in an expression", () => {
			const { assembler } = setup();
			const src = `
				test = 1

				.namespace earth
					test = 2
					.macro log
						.db test
					.end
					log
				.end namespace

				log
			`;
			assembler.assemble(src);
			const machineCode6502 = assembler.link();

			expect(machineCode6502).toEqual([2, 1]);
		});
	});

	describe("real life example", () => {
		it("should works ;)", () => {
			const { assembler } = setup();
			const src = `
				.macro assertDefinedLabels neededLabels, errmsg
					.if .type(neededLabels) != "array"
						.error "checkIfDefined needs an array of strings as label names"
					.end

					.log "neededLabels = ", neededLabels

					missingLabels = .array()
					.for label of neededLabels

						.log "label = ",label, "undef?", .undef(label)

						.if .undef(label)
							.log "add label", label
							missingLabels= .push(missingLabels, label)
						.end
					.end

					.log "len(missingLabels) = ", .len(missingLabels)

					.if .len(missingLabels) != 0
						.error errmsg, " ", missingLabels
					.end
				.end

				labels = .array("ONE", "TWO")
				assertDefinedLabels labels, "Missing game interface fields"

			`;

			expect(() => assembler.assemble(src)).toThrow("[ERROR] Missing game interface fields	 	[ONE, TWO]");
		});
		it("should works too;)", () => {
			const { assembler } = setup();
			const src = `
				.macro ifx ...parms {
					.if .len(parms)!=2
						.error "Macro ifx : needs 2 params"
					.end

					.if .type(parms[0])!="string"
						.error "Macro ifx : the first parm <",parms[0],"> needs to be a string"
					.end

					expr= .split(parms[0])
					goto= parms[1]
					parmIdx= 0

					.if .len(expr)=3
						ldx %(expr[parmIdx])
						parmIdx= parmIdx + 1
					.end

					op= expr[parmIdx]
					value= expr[parmIdx+1]

					isValidOp= 0

					cpx %(value)

					.if op="<" {
						isValidOp= 1
						bcc goto
					}

					.if op="<="
						isValidOp= 1
						bcc goto
						beq goto
					.end

					.if op=">"
						isValidOp= 1
						beq :+
						bcs goto
						:
					.end

					.if op=">="
						isValidOp= 1
						bcs goto
						:
					.end

					.if !isValidOp
						.error "Macro ifx : Invalid Operation ",op
					.end

				}

					ifx "$300 < #130", end

					nop

				end:
					rts

			`;

			expect(() => assembler.assemble(src)).toThrow("[ERROR] Missing game interface fields	 	[ONE, TWO]");
		});
	});
});
