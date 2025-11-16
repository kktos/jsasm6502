export type TokenType =
	// Structural
	| "DIRECTIVE" // .MACRO, .EQU, .ORG, etc.
	| "IDENTIFIER" // labels, symbols, instructions
	| "LABEL" // identifier followed by ':'

	// Literals
	| "NUMBER" // $1234, %1010, 42, -50
	| "STRING" // "file.asm"
	| "OPERATOR"

	// Operators
	| "DOT" // . (when not part of directive)
	| "COMMA"
	| "HASH"
	| "LPAREN"
	| "RPAREN"
	| "PLUS"
	| "MINUS"
	| "MULTIPLY"
	| "DIVIDE"

	// Block
	| "LBRACE"
	| "RBRACE"

	// Special
	| "COMMENT"
	| "NEWLINE"
	| "EOF";

export interface Token {
	type: TokenType;
	value: string;
	line: number | string;
	column: number;
}

export class AssemblyLexer {
	private source = "";
	private pos = 0;
	private line = 1;
	private column = 1;
	private length = 0;

	// constructor(source: string) {
	// 	this.source = source;
	// 	this.length = source.length;
	// }

	// Main tokenization loop - optimized for V8's speculative optimization
	public tokenize(source: string): Token[] {
		this.source = source;
		this.length = source.length;

		const tokens: Token[] = [];

		while (this.pos < this.length) {
			const token = this.nextToken();
			if (token) {
				tokens.push(token);
				if (token.type === "EOF") break;
			}
		}

		return tokens;
	}

	// Single-pass token extraction with minimal backtracking
	private nextToken(): Token | null {
		this.skipWhitespace();

		if (this.pos >= this.length) {
			return this.makeToken("EOF", "");
		}

		const ch = this.source[this.pos];
		const startLine = this.line;
		const startColumn = this.column;

		// Comment - fast path for semicolon
		if (ch === ";") {
			return this.scanComment(startLine, startColumn);
		}

		// Check for // or /* comments
		if (ch === "/") {
			const next = this.peekAhead(1); // look ahead one char
			if (next === "/") {
				return this.scanComment(startLine, startColumn);
			}
			if (next === "*") {
				return this.scanMultiLineComment(startLine, startColumn);
			}
			// Otherwise it's division operator
			this.advance();
			// return this.makeToken("DIVIDE", "/", startLine, startColumn);
			return this.makeToken("OPERATOR", "/", startLine, startColumn);
		}

		// Single-char tokens - monomorphic check pattern for V8
		switch (ch) {
			// case ",":
			// 	this.advance();
			// 	return this.makeToken("COMMA", ",", startLine, startColumn);
			// case "#":
			// 	this.advance();
			// 	return this.makeToken("HASH", "#", startLine, startColumn);
			// case "(":
			// 	this.advance();
			// 	return this.makeToken("LPAREN", "(", startLine, startColumn);
			// case ")":
			// 	this.advance();
			// 	return this.makeToken("RPAREN", ")", startLine, startColumn);
			// case "+":
			// 	this.advance();
			// 	return this.makeToken("PLUS", "+", startLine, startColumn);
			// case "*":
			// 	this.advance();
			// 	return this.makeToken("MULTIPLY", "*", startLine, startColumn);
			case ",":
				this.advance();
				return this.makeToken("COMMA", ",", startLine, startColumn);
			case "#":
				this.advance();
				return this.makeToken("OPERATOR", "#", startLine, startColumn);
			case "(":
				this.advance();
				return this.makeToken("OPERATOR", "(", startLine, startColumn);
			case ")":
				this.advance();
				return this.makeToken("OPERATOR", ")", startLine, startColumn);
			case "[":
				this.advance();
				return this.makeToken("OPERATOR", "[", startLine, startColumn);
			case "]":
				this.advance();
				return this.makeToken("OPERATOR", "]", startLine, startColumn);
			case "+":
				this.advance();
				return this.makeToken("OPERATOR", "+", startLine, startColumn);
			case "*":
				this.advance();
				return this.makeToken("OPERATOR", "*", startLine, startColumn);

			case "{":
				this.advance();
				return this.makeToken("LBRACE", "{", startLine, startColumn);
			case "}":
				this.advance();
				return this.makeToken("RBRACE", "}", startLine, startColumn);
			case "\n":
				this.advance();
				this.line++;
				this.column = 1;
				// return this.makeToken("NEWLINE", "\n", startLine, startColumn);
				return null;
		}

		// Minus or negative number
		if (ch === "-") {
			this.advance();
			// Lookahead: if followed by digit, it's a number
			if (this.isDigit(this.peek())) {
				return this.scanNumber(startLine, startColumn, true);
			}
			// return this.makeToken("MINUS", "-", startLine, startColumn);
			return this.makeToken("OPERATOR", "-", startLine, startColumn);
		}

		// Dot - either standalone or part of directive
		if (ch === ".") {
			return this.scanDotOrDirective(startLine, startColumn);
		}

		// String literals
		if (ch === '"') {
			return this.scanString(startLine, startColumn);
		}

		// Numbers (hex $FF, binary %1010, decimal 42)
		if (this.isDigit(ch) || ch === "$" || ch === "%") {
			return this.scanNumber(startLine, startColumn);
		}

		// Identifiers (which could be instructions, labels, or symbols)
		if (this.isIdentifierStart(ch)) {
			return this.scanIdentifier(startLine, startColumn);
		}

		// Unknown character - skip
		this.advance();
		return null;
	}

	private scanComment(line: number, column: number): Token {
		const start = this.pos;

		// Skip comment starter (either ';' or '//')
		this.advance();
		if (this.source[this.pos - 1] === "/" && this.peek() === "/") {
			this.advance(); // skip second '/'
		}

		// Fast scan to end of line using indexOf
		let end = this.source.indexOf("\n", this.pos);
		if (end === -1) end = this.length;

		const value = this.source.slice(start, end);
		this.pos = end;
		this.column += end - start;

		return this.makeToken("COMMENT", value, line, column);
	}

	private scanMultiLineComment(line: number, column: number): Token {
		const start = this.pos;

		this.advance(); // skip '/'
		this.advance(); // skip '*'

		// Scan until we find '*/'
		while (this.pos < this.length - 1) {
			if (this.peek() === "*" && this.peekAhead(1) === "/") {
				this.advance(); // skip '*'
				this.advance(); // skip '/'
				break;
			}

			// Track line numbers within the comment
			if (this.peek() === "\n") {
				this.line++;
				this.column = 0; // will be incremented by advance()
			}

			this.advance();
		}

		const value = this.source.slice(start, this.pos);
		return this.makeToken("COMMENT", value, line, column);
	}

	private scanDotOrDirective(line: number, column: number): Token {
		this.advance(); // skip '.'

		// If not followed by letter, it's just a dot
		if (!this.isAlpha(this.peek())) {
			return this.makeToken("DOT", ".", line, column);
		}

		// Scan the identifier after the dot
		const start = this.pos;
		while (this.isAlphaNumeric(this.peek()) || this.peek() === "_") {
			this.advance();
		}

		const identifier = this.source.slice(start, this.pos);
		const value = `.${identifier}`;

		return this.makeToken("DIRECTIVE", value.toUpperCase(), line, column);
	}

	private scanString(line: number, column: number): Token {
		const start = this.pos;
		this.advance(); // skip opening "

		while (this.peek() !== '"' && this.peek() !== "\n" && this.pos < this.length) {
			if (this.peek() === "\\") {
				this.advance(); // skip escape char
				if (this.pos < this.length) {
					this.advance(); // skip escaped char
				}
			} else {
				this.advance();
			}
		}

		if (this.peek() === '"') {
			this.advance(); // skip closing "
		}

		const value = this.source.slice(start, this.pos);
		return this.makeToken("STRING", value, line, column);
	}

	private scanNumber(line: number, column: number, negative = false): Token {
		const start = negative ? this.pos - 1 : this.pos;

		// Hex number: $1234, $ABCD
		if (this.peek() === "$") {
			this.advance();
			while (this.isHexDigit(this.peek())) {
				this.advance();
			}
		}
		// Binary number: %10101010
		else if (this.peek() === "%") {
			this.advance();
			while (this.peek() === "0" || this.peek() === "1") {
				this.advance();
			}
		}
		// Decimal number: 42, 1234
		else {
			while (this.isDigit(this.peek())) {
				this.advance();
			}
		}

		const value = this.source.slice(start, this.pos);
		return this.makeToken("NUMBER", value, line, column);
	}

	private scanIdentifier(line: number, column: number): Token {
		const start = this.pos;

		// Scan identifier: letters, digits, underscore, and dot (for addressing modes like LDA.W)
		while (this.isIdentifierPart(this.peek())) {
			this.advance();
		}

		const value = this.source.slice(start, this.pos);

		// Check if followed by colon - that makes it a label
		if (this.peek() === ":") {
			this.advance(); // consume ':'
			return this.makeToken("LABEL", value, line, column);
		}

		// Otherwise it's just an identifier (could be instruction, symbol, macro name, etc.)
		return this.makeToken("IDENTIFIER", value, line, column);
	}

	// Character classification - monomorphic for V8 optimization
	private isDigit(ch: string): boolean {
		return ch >= "0" && ch <= "9";
	}

	private isHexDigit(ch: string): boolean {
		return (ch >= "0" && ch <= "9") || (ch >= "A" && ch <= "F") || (ch >= "a" && ch <= "f");
	}

	private isAlpha(ch: string): boolean {
		return (ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || ch === "_";
	}

	private isAlphaNumeric(ch: string): boolean {
		return this.isAlpha(ch) || this.isDigit(ch);
	}

	private isIdentifierStart(ch: string): boolean {
		return this.isAlpha(ch);
	}

	private isIdentifierPart(ch: string): boolean {
		// Allow dot in identifiers for addressing modes (LDA.W, LDA.B)
		return this.isAlphaNumeric(ch) || ch === "_" || ch === ".";
	}

	private skipWhitespace(): void {
		// V8 optimizes simple loops with bounds checks
		while (this.pos < this.length) {
			const ch = this.source[this.pos];
			if (ch === " " || ch === "\t" || ch === "\r") {
				this.advance();
			} else {
				break;
			}
		}
	}

	// Hot path methods - inline candidates
	private peek(): string {
		return this.pos < this.length ? this.source[this.pos] : "";
	}

	private peekAhead(offset: number): string {
		const pos = this.pos + offset;
		return pos < this.length ? this.source[pos] : "";
	}
	private advance(): void {
		this.pos++;
		this.column++;
	}

	private makeToken(type: TokenType, value: string, line = this.line, column = this.column): Token {
		return { type, value, line, column };
	}
}

/*
// Usage example
const source = `
  ; define the macro INIT_REGS
  .MACRO INIT_REGS val, addr {
    LDA val
    STA addr
  }

  ZP_VAR .EQU $12
  ABS_VAR .EQU $1234
  SCREEN_WIDTH .EQU 40 * (8 + 2) - 10
  NEGATIVE_VAL .EQU -50

Start:
  .ORG $2000 + SCREEN_WIDTH
  LDA $F800 ; monitor start
  INIT_REGS #$EA, $300
  LDA.W ZP_VAR
  LDA ABS_VAR,X
  LDA (ZP_VAR),Y
  .INCLUDE "symbols.asm"
  RTS
  .INCBIN "logo.bin"
`;

const lexer = new AssemblyLexer(source);
const tokens = lexer.tokenize();

// Display non-whitespace tokens
const display = tokens
  .filter(t => t.type !== TokenType.NEWLINE && t.type !== TokenType.COMMENT)
  .slice(0, 40)
  .map(t => `${t.type.padEnd(12)} | ${t.value}`);

console.log('Sample tokens:\n' + display.join('\n'));

*/
