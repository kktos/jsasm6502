import { describe, expect, it } from "vitest";
import { ExpressionEvaluator } from "./expression";
import { PASymbolTable } from "./symbol.class";
import { AssemblyLexer } from "./lexer/lexer.class";

describe("ExpressionEvaluator", () => {
	const setup = () => {
		const symbolTable = new PASymbolTable();
		const evaluator = new ExpressionEvaluator(symbolTable);
		const lexer = new AssemblyLexer();
		const tokenize = (expr: string) => lexer.tokenize(expr);
		return { symbolTable, evaluator, lexer, tokenize };
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

		it("should handle modulo operator", () => {
			const { evaluator, tokenize } = setup();
			expect(evaluator.evaluateAsNumber(tokenize("10 % 3"), { pc: 0 })).toBe(1);
		});

		it("should handle modulo operator precedence", () => {
			const { evaluator, tokenize } = setup();
			// Precedence: 5 + (10 % 3) * 2 = 5 + 1 * 2 = 5 + 2 = 7
			expect(evaluator.evaluateAsNumber(tokenize("5 + 10 % 3 * 2"), { pc: 0 })).toBe(7);
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
			// expect(evaluator.evaluateAsNumber(tokenize("$F0 | $09"), { pc: 0 })).toBe(0xf9);
			// expect(evaluator.evaluateAsNumber(tokenize("$AA ^ $FF"), { pc: 0 })).toBe(0x55);
		});
	});

	describe("Bitwise Operations", () => {
		it("should evaluate bitwise OR", () => {
			const { evaluator, tokenize } = setup();
			expect(evaluator.evaluateAsNumber(tokenize("$F0 | $09"), { pc: 0 })).toBe(0xf9);
			// expect(evaluator.evaluateAsNumber(tokenize("$AA ^ $FF"), { pc: 0 })).toBe(0x55);
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

	describe("Bitwise Shift Operations", () => {
		it("should evaluate bitwise left and right shifts", () => {
			const { evaluator, tokenize } = setup();
			expect(evaluator.evaluateAsNumber(tokenize("8 << 2"), { pc: 0 })).toBe(32);
			expect(evaluator.evaluateAsNumber(tokenize("32 >> 3"), { pc: 0 })).toBe(4);
		});

		it("should respect shift operator precedence", () => {
			const { evaluator, tokenize } = setup();
			// Expression: 5 + 2 << 1 -> (5 + 2) << 1 -> 7 << 1 -> 14
			expect(evaluator.evaluateAsNumber(tokenize("5 + 2 << 1"), { pc: 0 })).toBe(14);
			// Expression: 16 >> 1 & 7 -> (16 >> 1) & 7 -> 8 & 7 -> 0
			expect(evaluator.evaluateAsNumber(tokenize("16 >> 1 & 7"), { pc: 0 })).toBe(0);
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

		it("should handle string concatenation", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize('"Hello" + " " + "World" + " " + 123');
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toBe("Hello World 123");
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
