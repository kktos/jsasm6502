import { beforeEach, describe, expect, it, test } from "vitest";
import { AssemblyLexer, type Token } from "./lexer.class";

describe("AssemblyLexer", () => {
	let lexer: AssemblyLexer;

	beforeEach(() => {
		lexer = new AssemblyLexer();
	});

	// Helper to strip location info for simpler snapshot comparisons
	const stripLocation = (tokens: Token[]) => {
		return tokens.map(({ line, column, ...rest }) => rest);
	};

	test("should tokenize a simple instruction", () => {
		const source = "LDA #$10";
		const tokens = lexer.tokenize(source);
		expect(stripLocation(tokens)).toEqual([
			{ type: "IDENTIFIER", value: "LDA", raw: "LDA" },
			{ type: "OPERATOR", value: "#", raw: undefined },
			{ type: "NUMBER", value: "16", raw: "$10" },
		]);
	});

	test("should tokenize labels and identifiers", () => {
		const source = "LOOP: NOP ; comment\n  LDA.W VALUE";
		const tokens = lexer.tokenize(source);
		expect(stripLocation(tokens)).toEqual([
			{ type: "LABEL", value: "LOOP", raw: undefined },
			{ type: "IDENTIFIER", value: "NOP", raw: "NOP" },
			{ type: "IDENTIFIER", value: "LDA", raw: "LDA" },
			{ type: "DOT", value: ".", raw: undefined },
			{ type: "IDENTIFIER", value: "W", raw: "W" },
			{ type: "IDENTIFIER", value: "VALUE", raw: "VALUE" },
		]);
	});

	test("should tokenize various number formats", () => {
		const source = "123 $DEAD %10110 -42 0xbeef 0b11";
		const tokens = lexer.tokenize(source);
		expect(stripLocation(tokens)).toEqual([
			{ type: "NUMBER", value: "123", raw: "123" },
			{ type: "NUMBER", value: "57005", raw: "$DEAD" },
			{ type: "NUMBER", value: "22", raw: "%10110" },
			{ type: "OPERATOR", value: "-", raw: undefined },
			{ type: "NUMBER", value: "42", raw: "42" },
			{ type: "NUMBER", value: "48879", raw: "$beef" },
			{ type: "NUMBER", value: "3", raw: "%11" },
		]);
	});

	test("should distinguish unary minus from subtract operator", () => {
		const source = "LDA #-10\nSUB #10-1";
		const tokens = lexer.tokenize(source);
		expect(stripLocation(tokens)).toEqual([
			{ type: "IDENTIFIER", value: "LDA", raw: "LDA" },
			{ type: "OPERATOR", value: "#", raw: undefined },
			{ type: "NUMBER", value: "-10", raw: "10" },
			{ type: "IDENTIFIER", value: "SUB", raw: "SUB" },
			{ type: "OPERATOR", value: "#", raw: undefined },
			{ type: "NUMBER", value: "10", raw: "10" },
			{ type: "OPERATOR", value: "-", raw: undefined },
			{ type: "NUMBER", value: "1", raw: "1" },
		]);
	});

	test("should tokenize directives and strings", () => {
		const source = '.ORG $8000\n.BYTE "Hello, World!", $0D, $0A';
		const tokens = lexer.tokenize(source);
		expect(stripLocation(tokens)).toEqual([
			{ type: "DOT", value: ".", raw: undefined },
			{ type: "IDENTIFIER", value: "ORG", raw: "ORG" },
			{ type: "NUMBER", value: "32768", raw: "$8000" },
			{ type: "DOT", value: ".", raw: undefined },
			{ type: "IDENTIFIER", value: "BYTE", raw: "BYTE" },
			{ type: "STRING", value: "Hello, World!", raw: undefined },
			{ type: "COMMA", value: ",", raw: undefined },
			{ type: "NUMBER", value: "13", raw: "$0D" },
			{ type: "COMMA", value: ",", raw: undefined },
			{ type: "NUMBER", value: "10", raw: "$0A" },
		]);
	});

	test("should handle various comments", () => {
		const source = `
      ; This is a whole line comment
      LDA #10 ; This is an end-of-line comment
      // This is a C++ style comment
      /* This is a
         multi-line comment */
      FIN:
    `;
		const tokens = lexer.tokenize(source);
		expect(stripLocation(tokens)).toEqual([
			{ type: "IDENTIFIER", value: "LDA", raw: "LDA" },
			{ type: "OPERATOR", value: "#", raw: undefined },
			{ type: "NUMBER", value: "10", raw: "10" },
			{ type: "LABEL", value: "FIN", raw: undefined },
			{ type: "EOF", value: "", raw: undefined },
		]);
	});

	test("should tokenize local and anonymous labels", () => {
		const source = `
      :       ; anonymous label definition
      BNE :-    ; branch to previous anonymous label
      :loop   ; local label definition
      INC A
      JMP :loop ; jump to local label
      BEQ :+    ; branch to next anonymous label
      :       ; next anonymous label
    `;
		const tokens = lexer.tokenize(source);
		expect(stripLocation(tokens)).toEqual([
			{ type: "ANONYMOUS_LABEL_DEF", value: ":", raw: undefined },
			{ type: "IDENTIFIER", value: "BNE", raw: "BNE" },
			{ type: "ANONYMOUS_LABEL_REF", value: "-1", raw: undefined },
			{ type: "LOCAL_LABEL", value: "LOOP", raw: undefined },
			{ type: "IDENTIFIER", value: "INC", raw: "INC" },
			{ type: "IDENTIFIER", value: "A", raw: "A" },
			{ type: "IDENTIFIER", value: "JMP", raw: "JMP" },
			{ type: "LOCAL_LABEL", value: "LOOP", raw: undefined },
			{ type: "IDENTIFIER", value: "BEQ", raw: "BEQ" },
			{ type: "ANONYMOUS_LABEL_REF", value: "+1", raw: undefined },
			{ type: "ANONYMOUS_LABEL_DEF", value: ":", raw: undefined },
			{ type: "EOF", value: "", raw: undefined },
		]);
	});

	test("should tokenize complex expressions", () => {
		const source = "LDA (<address + 1> & $FF00) >> 8";
		const tokens = lexer.tokenize(source);
		expect(stripLocation(tokens)).toEqual([
			{ type: "IDENTIFIER", value: "LDA", raw: "LDA" },
			{ type: "OPERATOR", value: "(", raw: undefined },
			{ type: "OPERATOR", value: "<", raw: undefined },
			{ type: "IDENTIFIER", value: "ADDRESS", raw: "address" },
			{ type: "OPERATOR", value: "+", raw: undefined },
			{ type: "NUMBER", value: "1", raw: "1" },
			{ type: "OPERATOR", value: ">", raw: undefined },
			{ type: "OPERATOR", value: "&", raw: undefined },
			{ type: "NUMBER", value: "65280", raw: "$FF00" },
			{ type: "OPERATOR", value: ")", raw: undefined },
			{ type: "OPERATOR", value: ">>", raw: undefined },
			{ type: "NUMBER", value: "8", raw: "8" },
		]);
	});

	test("should handle namespace operator", () => {
		const source = "JMP MYLIB::ROUTINE";
		const tokens = lexer.tokenize(source);
		expect(stripLocation(tokens)).toEqual([
			{ type: "IDENTIFIER", value: "JMP", raw: "JMP" },
			{
				type: "IDENTIFIER",
				value: "MYLIB::ROUTINE",
				raw: "ROUTINE",
			},
		]);
	});

	it("should recognize directive", () => {
		const source = `
		  .SEGMENT EXPR_SEG
		  .BYTE $CA, $FE
		`;
		const tokens = lexer.tokenize(source);
		expect(stripLocation(tokens)).toEqual([
			{ type: "DOT", value: ".", raw: undefined },
			{ type: "IDENTIFIER", value: "SEGMENT", raw: "SEGMENT" },
			{ type: "IDENTIFIER", value: "EXPR_SEG", raw: "EXPR_SEG" },
			{ type: "DOT", value: ".", raw: undefined },
			{ type: "IDENTIFIER", value: "BYTE", raw: "BYTE" },
			{ type: "NUMBER", value: "202", raw: "$CA" },
			{ type: "COMMA", value: ",", raw: undefined },
			{ type: "NUMBER", value: "254", raw: "$FE" },
			{ type: "EOF", value: "", raw: undefined },
		]);
	});

	it("should recognize a label and a directive", () => {
		const source = `
		  test .EQU 0
		`;
		const tokens = lexer.tokenize(source);
		expect(stripLocation(tokens)).toEqual([
			{ type: "IDENTIFIER", value: "TEST", raw: "test" },
			{ type: "DOT", value: ".", raw: undefined },
			{ type: "IDENTIFIER", value: "EQU", raw: "EQU" },
			{ type: "NUMBER", value: "0", raw: "0" },
			{ type: "EOF", value: "", raw: undefined },
		]);
	});

	it("should handle object properties", () => {
		const source = "shape.name";
		const tokens = lexer.tokenize(source);
		expect(stripLocation(tokens)).toEqual([
			{ type: "IDENTIFIER", value: "SHAPE", raw: "shape" },
			{ type: "DOT", value: ".", raw: undefined },
			{ type: "IDENTIFIER", value: "NAME", raw: "name" },
		]);
	});

	test("should handle object properties and array indices", () => {
		const source = "shapes[0].name";
		const tokens = lexer.tokenize(source);
		expect(stripLocation(tokens)).toEqual([
			{ type: "IDENTIFIER", value: "SHAPES", raw: "shapes" },
			{ type: "OPERATOR", value: "[", raw: undefined },
			{ type: "NUMBER", value: "0", raw: "0" },
			{ type: "OPERATOR", value: "]", raw: undefined },
			{ type: "DOT", value: ".", raw: undefined },
			{ type: "IDENTIFIER", value: "NAME", raw: "name" },
		]);
	});

	test("should tokenize raw text block on demand", () => {
		const source = `
			.DEFINE myVar
					This is some raw data.
					It can span multiple lines.
					The lexer should preserve it.
					LDA #$10 ; this is inside raw
			.END ; comment after end
			JMP START
    `;
		lexer.startStream(source);

		const tokens: Token[] = [];
		// skip newline
		lexer.nextToken();
		// 1. Get .DEFINE directive
		tokens.push(lexer.nextToken() as Token);
		tokens.push(lexer.nextToken() as Token);
		// 2. Get the end marker
		lexer.nextToken() as Token;
		// 3. Instruct the lexer to get the raw text block
		tokens.push(lexer.nextToken({ endMarker: ".END" }) as Token);

		// skip comment
		lexer.nextToken();
		// skip newline
		lexer.nextToken();

		// 4. Continue tokenizing normally
		tokens.push(lexer.nextToken() as Token);
		tokens.push(lexer.nextToken() as Token);

		expect(stripLocation(tokens)).toEqual([
			// expect(tokens).toEqual([
			{ type: "DOT", value: ".", raw: undefined },
			{ type: "IDENTIFIER", value: "DEFINE", raw: "DEFINE" },
			{
				type: "RAW_TEXT",
				value:
					"					This is some raw data.\n					It can span multiple lines.\n					The lexer should preserve it.\n					LDA #$10 ; this is inside raw",
				raw: undefined,
			},
			{ type: "IDENTIFIER", value: "JMP", raw: "JMP" },
			{ type: "IDENTIFIER", value: "START", raw: "START" },
		]);
	});
});
