import { describe, expect, it } from "vitest";

import { Assembler, type FileHandler } from "./polyasm";
import { Cpu6502Handler } from "./cpu/cpu6502.class";
import { Logger } from "./logger";

describe("ExpressionEvaluator", () => {
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

	describe("Basic Arithmetic and Precedence", () => {
		it("should evaluate simple addition and subtraction", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("10 + 5 - 3");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(12);
		});

		it("should handle operator precedence (PEMDAS)", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("10 + 2 * 6");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(22);
		});

		it("should handle parentheses to override precedence", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("(10 + 2) * 6");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(72);
		});

		it("should handle integer division", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("13 / 4");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(3);
		});

		it("should handle unary minus", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("-10 * -2");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(20);
		});
	});

	describe("Number Formats and Symbols", () => {
		it("should evaluate different number formats (hex, binary, decimal)", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("$0A + %1010 + 10"); // 10 + 10 + 10
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(30);
		});

		it("should resolve symbols from the symbol table", () => {
			const { evaluator, tokenize, symbolTable } = setup();
			symbolTable.addSymbol("TEN", 10);
			const tokens = tokenize("TEN * 4");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(40);
		});

		it("should resolve the program counter symbol (*)", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("* + 16");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0x1000 });
			expect(result).toBe(0x1010);
		});

		it("should handle forward references when allowed", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("FutureLabel + 1");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0, allowForwardRef: true });
			expect(result).toBe(1); // FutureLabel resolves to 0
		});
	});

	describe("Bitwise Operations", () => {
		it("should evaluate bitwise AND, OR, and XOR", () => {
			const { evaluator, tokenize } = setup();
			expect(evaluator.evaluateAsNumber(tokenize("$F0 & $88"), { pc: 0 })).toBe(0x80);
			expect(evaluator.evaluateAsNumber(tokenize("$F0 | $09"), { pc: 0 })).toBe(0xf9);
			expect(evaluator.evaluateAsNumber(tokenize("$AA ^ $FF"), { pc: 0 })).toBe(0x55);
		});

		it("should respect bitwise operator precedence (& > ^ > |)", () => {
			const { evaluator, tokenize } = setup();
			// Expression: 12 & 10 ^ 6 | 3
			// (12 & 10) = 8
			// (8 ^ 6) = 14
			// (14 | 3) = 15
			const tokens = tokenize("12 & 10 ^ 6 | 3");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(15);
		});
	});

	describe("Comparison Operators", () => {
		it("should handle numeric equality (== and =)", () => {
			const { evaluator, tokenize } = setup();
			expect(evaluator.evaluateAsNumber(tokenize("10 == 10"), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize("10 = 10"), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize("10 == 5"), { pc: 0 })).toBe(0);
		});

		it("should handle numeric inequality (!=)", () => {
			const { evaluator, tokenize } = setup();
			expect(evaluator.evaluateAsNumber(tokenize("10 != 5"), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize("10 != 10"), { pc: 0 })).toBe(0);
		});

		it("should handle numeric relational operators (<, >, <=, >=)", () => {
			const { evaluator, tokenize } = setup();
			expect(evaluator.evaluateAsNumber(tokenize("20 > 10"), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize("10 < 20"), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize("20 < 10"), { pc: 0 })).toBe(0);
			expect(evaluator.evaluateAsNumber(tokenize("10 > 20"), { pc: 0 })).toBe(0);
			expect(evaluator.evaluateAsNumber(tokenize("10 <= 10"), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize("10 <= 20"), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize("20 <= 10"), { pc: 0 })).toBe(0);
			expect(evaluator.evaluateAsNumber(tokenize("10 >= 10"), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize("20 >= 10"), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize("10 >= 20"), { pc: 0 })).toBe(0);
		});

		it("should handle string equality (== and =)", () => {
			let run = setup();
			expect(run.evaluator.evaluateAsNumber(run.tokenize('"hello" == "hello"'), { pc: 0 })).toBe(1);
			run = setup();
			expect(run.evaluator.evaluateAsNumber(run.tokenize('"hello" = "hello"'), { pc: 0 })).toBe(1);
			run = setup();
			expect(run.evaluator.evaluateAsNumber(run.tokenize('"hello" == "world"'), { pc: 0 })).toBe(0);
		});

		it("should handle string inequality (!=)", () => {
			const { evaluator, tokenize } = setup();
			expect(evaluator.evaluateAsNumber(tokenize('"hello" != "world"'), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize('"hello" != "hello"'), { pc: 0 })).toBe(0);
		});
	});

	describe("Boolean Logic Operators", () => {
		it("should handle logical NOT (!)", () => {
			const { evaluator, tokenize } = setup();
			expect(evaluator.evaluateAsNumber(tokenize("!10"), { pc: 0 })).toBe(0);
			expect(evaluator.evaluateAsNumber(tokenize("!0"), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize("!(10 > 5)"), { pc: 0 })).toBe(0); // !(true) -> 0
			expect(evaluator.evaluateAsNumber(tokenize("!(5 > 10)"), { pc: 0 })).toBe(1); // !(false) -> 1
		});

		it("should handle logical AND (&&)", () => {
			const { evaluator, tokenize } = setup();
			expect(evaluator.evaluateAsNumber(tokenize("1 && 1"), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize("10 && 0"), { pc: 0 })).toBe(0);
			expect(evaluator.evaluateAsNumber(tokenize("(5 > 3) && (10 > 5)"), { pc: 0 })).toBe(1);
		});

		it("should handle logical OR (||)", () => {
			const { evaluator, tokenize } = setup();
			expect(evaluator.evaluateAsNumber(tokenize("1 || 0"), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize("0 || 0"), { pc: 0 })).toBe(0);
			expect(evaluator.evaluateAsNumber(tokenize("10 || -1"), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize("(5 < 3) || (10 > 5)"), { pc: 0 })).toBe(1);
			expect(evaluator.evaluateAsNumber(tokenize("1 == 1 || 2 == 3 && 4 == 4"), { pc: 0 })).toBe(1); // Precedence check
		});
	});

	describe("Functions", () => {
		it("should evaluate .LEN() on a string literal", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize('.LEN("hello")');
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(5);
		});

		it("should evaluate .LEN() on an array literal", () => {
			const { evaluator, tokenize, symbolTable } = setup();
			symbolTable.addSymbol("MyArr", [10, 20, 30]);
			const tokens = tokenize(".LEN([1, 2, 3])");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(3);
		});

		it("should evaluate .DEF() on a defined symbol", () => {
			const { evaluator, tokenize, symbolTable } = setup();
			symbolTable.addSymbol("MySymbol", 123);
			const tokens = tokenize(".DEF(MySymbol)");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(1);
		});

		it("should evaluate .DEF() on an undefined symbol", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize('.DEF("MySymbol")');
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(0);
		});

		it("should evaluate .UNDEF() on an undefined symbol", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize(".UNDEF(Unknown)");
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(1);
		});

		it("should evaluate .HEX() with one argument", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize(".HEX(255)");
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toBe("$FF");
		});

		it("should evaluate .HEX() with padding", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize(".HEX(42, 4)");
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toBe("$002A");
		});
	});

	describe("Data Structures", () => {
		it("should evaluate array literals", () => {
			const { evaluator, tokenize, symbolTable } = setup();
			symbolTable.addSymbol("MyVal", 100);
			const tokens = tokenize('[1, "two", MyVal + 50]');
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toEqual([1, "two", 150]);
		});

		it("should evaluate string literals", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize('"Hello World"');
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toBe("Hello World");
		});
	});

	describe("Error Handling", () => {
		it("should throw on division by zero", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("100 / 0");
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0 })).toThrow("Division by zero.");
		});

		it("should throw on undefined symbol when forward refs are not allowed", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("UndefinedSymbol");
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0 })).toThrow(
				"Undefined symbol 'UndefinedSymbol' on line 1.",
			);
		});

		it("should suggest a similar symbol for an undefined symbol", () => {
			const { evaluator, tokenize, symbolTable } = setup();
			symbolTable.addSymbol("MyLabel", 0x1000);
			const tokens = tokenize("MyLable"); // Typo
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0 })).toThrow(
				"Undefined symbol 'MyLable' on line 1. Did you mean 'MyLabel'?",
			);
		});

		it("should throw on mismatched parentheses", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("(10 + 5");
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0 })).toThrow(
				"Mismatched parenthesis: unmatched '(' left in stack.",
			);
		});

		it("should throw when a number is expected but a string is found", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize('"this is not a number"');
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0 })).toThrow(
				"Expression did not evaluate to a number as expected.",
			);
		});

		it("should throw on invalid expression format", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("5 5 +");
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0 })).toThrow(
				"Invalid expression format: Unexpected token '5' on line 1.",
			);
		});
	});
});
