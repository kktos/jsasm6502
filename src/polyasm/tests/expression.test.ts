import { describe, expect, it } from "vitest";
import { Assembler, type FileHandler } from "../polyasm";

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
		const assembler = new Assembler(fakeCPU, new MockFileHandler());
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
			const result = evaluator.evaluateAsNumber(tokens, {
				pc: 0,
				allowForwardRef: true,
			});
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
			expect(
				run.evaluator.evaluateAsNumber(run.tokenize('"hello" == "hello"'), {
					pc: 0,
				}),
			).toBe(1);
			run = setup();
			expect(
				run.evaluator.evaluateAsNumber(run.tokenize('"hello" = "hello"'), {
					pc: 0,
				}),
			).toBe(1);
			run = setup();
			expect(
				run.evaluator.evaluateAsNumber(run.tokenize('"hello" == "world"'), {
					pc: 0,
				}),
			).toBe(0);
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
			expect(
				evaluator.evaluateAsNumber(tokenize("1 == 1 || 2 == 3 && 4 == 4"), {
					pc: 0,
				}),
			).toBe(1); // Precedence check
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

		it.skip("should evaluate .UNDEF() on an undefined symbol", () => {
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

		it("should evaluate .IIF() to return the true or false value based on the condition", () => {
			const { evaluator, tokenize } = setup();

			const tokens = tokenize('.IIF(1!=0, "true", "false")');
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toBe("true");

			expect(evaluator.evaluate(tokenize('.IIF(50-50, "true", "false")'), { pc: 0 })).toBe("false");
		});
	});

	describe("Array Indexing", () => {
		it("should access elements by numeric index", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("[10, 20, 30][1]"); // Should be 20
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(20);
		});

		it("should access elements using an expression as index", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("[10, 20, 30][.LEN([10,20,30])-2]"); // Should be 20
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(20);
		});

		it("should access elements from a symbol-defined array", () => {
			const { evaluator, tokenize, symbolTable } = setup();
			symbolTable.define("myArr", [100, 200, 300]);
			const tokens = tokenize("myArr[2]"); // Should be 300
			const result = evaluator.evaluateAsNumber(tokens, { pc: 0 });
			expect(result).toBe(300);
		});

		it("should throw error when indexing a non-array", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("123[0]");
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0 })).toThrow("Attempted to index a non-array value on line 1.");
		});

		it("should throw error for out-of-bounds index", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("[1,2,3][3]");
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0 })).toThrow("Array index 3 out of bounds for array of length 3 on line 1.");
		});

		it("should throw error for non-numeric index", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize('[1,2,3]["hello"]');
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0 })).toThrow("Array index must be a number on line 1.");
		});
	});

	describe("Array Functions", () => {
		it("should evaluate .SPLIT() with default delimiter", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize('.SPLIT("one two three")');
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toEqual(["one", "two", "three"]);
		});

		it("should evaluate .SPLIT() with a custom delimiter", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize('.SPLIT("a,b,c", ",")');
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toEqual(["a", "b", "c"]);
		});

		it("should evaluate .ARRAY() with multiple arguments", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize('.ARRAY(1, "two", 3)');
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toEqual([1, "two", 3]);
		});

		it("should evaluate .ARRAY() with no arguments to create an empty array", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize(".ARRAY()");
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toEqual([]);
		});

		it("should evaluate .PUSH() to add items to an array", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize(".PUSH(.ARRAY(0, 1), 2, 3)");
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toEqual([0, 1, 2, 3]);
		});

		it("should evaluate .POP() to get the last item from an array", () => {
			const { evaluator, tokenize, symbolTable } = setup();
			const originalArray = [1, 2, 3];
			symbolTable.define("nums", originalArray);
			const tokens = tokenize(".POP(nums)");
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toBe(3);
			// Ensure the original array held by the symbol is not modified
			expect(symbolTable.lookupSymbol("nums")).toEqual([1, 2, 3]);
		});

		it("should evaluate .JOIN() to concatenate array elements", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize('.JOIN([1, "two", 3], ",")');
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toBe("1,two,3");
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

		it.skip("should evaluate nested array literals", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize('[[1, 2], [3, 4], "five"]');
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toEqual([[1, 2], [3, 4], "five"]);
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
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0 })).toThrow("Undefined symbol 'UNDEFINEDSYMBOL' on line 1.");
		});

		it("should suggest a similar symbol for an undefined symbol", () => {
			const { evaluator, tokenize, symbolTable } = setup();
			symbolTable.addSymbol("MyLabel", 0x1000);
			const tokens = tokenize("MyLable"); // Typo
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0 })).toThrow("Undefined symbol 'MYLABLE' on line 1. Did you mean 'MYLABEL'?");
		});

		it("should throw on mismatched parentheses", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("(10 + 5");
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0 })).toThrow("Mismatched parenthesis: unmatched '(' left in stack.");
		});

		it("should throw when a number is expected but a string is found", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize('"this is not a number"');
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0 })).toThrow("Expression did not evaluate to a number as expected.");
		});

		it("should throw on invalid expression format", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize("5 5 +");
			expect(() => evaluator.evaluateAsNumber(tokens, { pc: 0 })).toThrow("Invalid expression format: Unexpected token '5' on line 1.");
		});
	});

	describe("System Variables", () => {
		it("should evaluate .NAMESPACE to the current namespace", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize(".NAMESPACE");
			const result = evaluator.evaluate(tokens, { pc: 0 });
			expect(result).toBe("global");
		});

		it("should evaluate .NAMESPACE to the current namespace", () => {
			const { evaluator, tokenize } = setup();
			const tokens = tokenize(".PC");
			const result = evaluator.evaluate(tokens, { pc: 1000 });
			expect(result).toBe(1000);
		});
	});
});
