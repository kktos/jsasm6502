import type { SymbolValue } from "../symbol.class";

export type TokenType =
	// Structural
	| "DIRECTIVE" // .MACRO, .EQU, .ORG, etc.
	| "IDENTIFIER" // labels, symbols, instructions
	| "LABEL" // identifier followed by ':'
	| "LOCAL_LABEL" // :loop
	| "ANONYMOUS_LABEL_DEF" // :
	| "FUNCTION"
	| "SYSVAR"
	| "ANONYMOUS_LABEL_REF" // :- or :+ or :-- or :+3

	// Literals
	| "NUMBER" // $1234, %1010, 42, -50
	| "STRING"
	| "RAW_TEXT"
	| "ARRAY"
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

type BaseToken = {
	line: number | string;
	column: number;
	raw?: string;
	argCount?: number;
};

export type StringValueToken<T extends TokenType> = BaseToken & {
	type: T;
	value: string;
};

export type OperatorToken = StringValueToken<"OPERATOR">;
export type FunctionToken = StringValueToken<"FUNCTION">;
export type OperatorStackToken = OperatorToken | FunctionToken;
export type DirectiveToken = StringValueToken<"DIRECTIVE">;
export type IdentifierToken = StringValueToken<"IDENTIFIER">;

export type ScalarToken = StringValueToken<Exclude<TokenType, "ARRAY">>;

export type ArrayValueToken = BaseToken & {
	type: "ARRAY";
	value: SymbolValue[];
};

export type Token = ScalarToken | ArrayValueToken;

export class AssemblyLexer {
	private source = "";
	private pos = 0;
	private line = 1;
	private column = 1;
	private length = 0;
	private localLabelChar = ":";
	private lastToken: Token | null = null;
	// Buffer for incremental/token-stream usage
	private tokenBuffer: Token[] = [];
	private endMarker: string | undefined;

	constructor(options?: { localLabelStyle?: string }) {
		if (options?.localLabelStyle) {
			this.localLabelChar = options.localLabelStyle;
		}
	}

	// Main tokenization loop - optimized for V8's speculative optimization
	public tokenize(source: string): Token[] {
		this.resetStream();
		this.source = source;
		this.length = source.length;

		this.pos = 0;
		this.line = 1;
		this.column = 1;
		this.lastToken = null;

		this.tokenBuffer = [];

		while (this.pos < this.length) {
			const token = this.nextToken();
			if (token) {
				this.lastToken = token;
				this.tokenBuffer.push(token);
				if (token.type === "EOF") break;
			}
		}

		return this.tokenBuffer.slice();
	}

	/** Initializes the lexer for incremental/token-stream consumption. */
	public startStream(source: string): void {
		this.resetStream();
		this.source = source;
		this.length = source.length;

		this.pos = 0;
		this.line = 1;
		this.column = 1;
		this.lastToken = null;

		this.tokenBuffer = [];
	}

	private resetStream(): void {
		this.tokenBuffer = [];
	}

	public setEndMarker(endMarker: string | undefined): void {
		this.endMarker = endMarker;
	}

	/**
	 * Ensures the internal buffer contains a token at `index`. Returns the token
	 * if available, otherwise `null` (end of input).
	 */
	public ensureBuffered(index: number): Token | null {
		// Generate tokens until we have the requested index or reach EOF
		while (this.tokenBuffer.length <= index) {
			// If we've already consumed the whole source, stop
			if (this.pos >= this.length) {
				// If EOF not yet buffered, push it
				if (this.tokenBuffer.length === 0 || this.tokenBuffer[this.tokenBuffer.length - 1].type !== "EOF") {
					const eof = this.makeToken("EOF", "", this.line, this.column);
					this.tokenBuffer.push(eof);
				}
				break;
			}

			const t = this.nextToken({ endMarker: this.endMarker });
			if (!t) continue; // skip null tokens (e.g., newlines)
			this.lastToken = t;
			this.tokenBuffer.push(t);
			if (t.type === "EOF") break;
		}

		return this.tokenBuffer[index] ?? null;
	}

	/** Returns the buffered tokens (may grow as ensureBuffered is called). */
	public getBufferedTokens(): Token[] {
		return this.tokenBuffer;
	}

	public rewind(offset: number, pos: { line: number; column: number; pos: number }) {
		this.tokenBuffer.length -= offset;
		this.line = pos.line;
		this.column = pos.column;
		this.pos = pos.pos;
		this.lastToken = this.tokenBuffer[this.tokenBuffer.length - 1];
	}

	/** Consume and return the next token from the stream (or null at EOF). */
	public nextFromStream(): Token | null {
		// Ensure at least one token is buffered
		const token = this.ensureBuffered(this.tokenBuffer.length);
		if (!token) return null;
		// Pop the next token off the buffer front
		const next = this.tokenBuffer.shift() as Token;
		// Keep lastToken updated
		this.lastToken = next;
		return next;
	}

	/** Peek ahead `offset` tokens without consuming them. */
	public peekBuffered(offset = 0): Token | null {
		return this.ensureBuffered(offset) ?? null;
	}

	// Single-pass token extraction with minimal backtracking
	public nextToken(options?: { endMarker?: string }): Token | null {
		this.skipWhitespace();

		if (this.pos >= this.length) return this.makeToken("EOF", "");

		if (options?.endMarker) return this.scanRawTextBlock(this.line, this.column, options.endMarker);

		const ch = this.source[this.pos];
		const startLine = this.line;
		const startColumn = this.column;

		// Comment - fast path for semicolon
		if (ch === ";") return this.scanComment(startLine, startColumn);

		// Named or Nameless Local Labels
		if (ch === this.localLabelChar) return this.scanLocalLabel(startLine, startColumn, ch);

		// Check for // or /* comments
		if (ch === "/") {
			const next = this.peekAhead(1); // look ahead one char
			if (next === "/") return this.scanComment(startLine, startColumn);
			if (next === "*") return this.scanMultiLineComment(startLine, startColumn);

			// Otherwise it's division operator
			this.advance();
			// return this.makeToken("DIVIDE", "/", startLine, startColumn);
			return this.makeToken("OPERATOR", "/", startLine, startColumn);
		}

		// Multi-character operators
		if (ch === "<" && this.peekAhead(1) === "<") {
			this.advance();
			this.advance();
			return this.makeToken("OPERATOR", "<<", startLine, startColumn);
		}
		if (ch === ">" && this.peekAhead(1) === ">") {
			this.advance();
			this.advance();
			return this.makeToken("OPERATOR", ">>", startLine, startColumn);
		}

		if (ch === "&" && this.peekAhead(1) === "&") {
			this.advance();
			this.advance();
			return this.makeToken("OPERATOR", "&&", startLine, startColumn);
		}
		if (ch === "|" && this.peekAhead(1) === "|") {
			this.advance();
			this.advance();
			return this.makeToken("OPERATOR", "||", startLine, startColumn);
		}
		if (ch === "=" && this.peekAhead(1) === "=") {
			this.advance();
			this.advance();
			return this.makeToken("OPERATOR", "==", startLine, startColumn);
		}
		if (ch === "!" && this.peekAhead(1) === "=") {
			this.advance();
			this.advance();
			return this.makeToken("OPERATOR", "!=", startLine, startColumn);
		}
		if (ch === "<" && this.peekAhead(1) === "=") {
			this.advance();
			this.advance();
			return this.makeToken("OPERATOR", "<=", startLine, startColumn);
		}
		if (ch === ">" && this.peekAhead(1) === "=") {
			this.advance();
			this.advance();
			return this.makeToken("OPERATOR", ">=", startLine, startColumn);
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
			case "&":
				this.advance();
				return this.makeToken("OPERATOR", "&", startLine, startColumn);
			case "|":
				this.advance();
				return this.makeToken("OPERATOR", "|", startLine, startColumn);
			case "=":
				this.advance();
				return this.makeToken("OPERATOR", "=", startLine, startColumn);
			case "^":
				this.advance();
				return this.makeToken("OPERATOR", "^", startLine, startColumn);

			case "!":
				this.advance();
				return this.makeToken("OPERATOR", "!", startLine, startColumn);

			case ".":
				this.advance();
				return this.makeToken("DOT", ".", startLine, startColumn);

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
			// A minus is a negative number if it's at the start of an expression
			// (no previous token) or follows an operator, comma, or parenthesis.
			const isUnary =
				!this.lastToken || // Start of expression
				this.lastToken.type === "COMMA" || // After a comma
				(this.lastToken.type === "OPERATOR" &&
					this.lastToken.value !== ")" && // Not after a closing parenthesis
					this.lastToken.value !== "]"); // Not after a closing bracket
			if (isUnary && this.isDigit(this.peek())) {
				return this.scanNumber(startLine, startColumn, true);
			}
			// return this.makeToken("MINUS", "-", startLine, startColumn);
			return this.makeToken("OPERATOR", "-", startLine, startColumn);
		}

		// Dot - either standalone or part of directive
		// if (ch === ".") return this.scanDotOrDirective(startLine, startColumn);

		// String literals
		if (ch === '"') return this.scanString(startLine, startColumn);

		// Numbers (hex $FF, binary %1010, decimal 42)
		if (this.isDigit(ch) || ch === "$") {
			return this.scanNumber(startLine, startColumn);
		}

		// Handle ambiguity of '%' (binary prefix vs. modulo operator)
		if (ch === "%") {
			const next = this.peekAhead(1);
			if (next === "0" || next === "1") {
				return this.scanNumber(startLine, startColumn);
			}
			// It's not a binary number prefix, so it must be the modulo operator
			this.advance();
			return this.makeToken("OPERATOR", "%", startLine, startColumn);
		}

		// Handle single character comparison operators
		if (ch === "<" || ch === ">") {
			this.advance();
			return this.makeToken("OPERATOR", ch, startLine, startColumn);
		}

		// Identifiers (which could be instructions, labels, or symbols)
		if (this.isIdentifierStart(ch)) {
			return this.scanIdentifier(startLine, startColumn);
		}

		// Unknown character - skip
		this.advance();
		return null;
	}

	private scanComment(_line: number, _column: number) {
		const start = this.pos;

		// Skip comment starter (either ';' or '//')
		this.advance();
		if (this.source[this.pos - 1] === "/" && this.peek() === "/") {
			this.advance(); // skip second '/'
		}

		// Fast scan to end of line using indexOf
		let end = this.source.indexOf("\n", this.pos);
		if (end === -1) end = this.length;

		// const value = this.source.slice(start, end);
		this.pos = end;
		this.column += end - start;

		return null; // this.makeToken("COMMENT", value, line, column);
	}

	private scanMultiLineComment(_line: number, _column: number) {
		// const start = this.pos;

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

		// const value = this.source.slice(start, this.pos);
		return null; // this.makeToken("COMMENT", value, line, column);
	}

	private scanString(line: number, column: number): Token {
		let value = "";
		this.advance(); // skip opening "

		while (this.peek() !== '"' && this.peek() !== "\n" && this.pos < this.length) {
			if (this.peek() === "\\") {
				this.advance(); // skip escape char
				const escaped = this.peek();
				this.advance(); // consume escaped char
				switch (escaped) {
					case "n":
						value += "\n";
						break;
					case "r":
						value += "\r";
						break;
					case "t":
						value += "\t";
						break;
					case "b":
						value += "\b";
						break;
					case "f":
						value += "\f";
						break;
					case "'":
						value += "'";
						break;
					case '"':
						value += '"';
						break;
					case "\\":
						value += "\\";
						break;
					case "x": {
						const hexCode = this.source.substring(this.pos, this.pos + 2);
						if (hexCode.length === 2 && /^[0-9a-fA-F]+$/.test(hexCode)) {
							value += String.fromCharCode(Number.parseInt(hexCode, 16));
							this.advance();
							this.advance();
						} else {
							value += "x"; // Not a valid hex escape, treat literally
						}
						break;
					}
					default:
						value += escaped; // Unknown escape sequence, treat literally
				}
			} else {
				value += this.peek();
				this.advance();
			}
		}

		if (this.peek() === '"') {
			this.advance(); // skip closing "
		}

		return this.makeToken("STRING", value, line, column);
	}

	private scanNumber(line: number, column: number, negative = false): Token {
		const firstChar = this.peek();
		const secondChar = this.peekAhead(1).toLowerCase();
		let radix: number;

		// Determine radix and skip prefix
		if (firstChar === "$" || (firstChar === "0" && secondChar === "x")) {
			radix = 16;
			this.advance();
			if (firstChar === "0") this.advance(); // skip 'x'
		} else if (firstChar === "%" || (firstChar === "0" && secondChar === "b" && (this.peekAhead(2) === "0" || this.peekAhead(2) === "1"))) {
			radix = 2;
			this.advance();
			if (firstChar === "0") this.advance(); // skip 'b'
		} else {
			radix = 10;
		}

		const start = this.pos;
		while (this.isValidDigitForRadix(this.peek(), radix) || this.peek() === "_") {
			this.advance();
		}

		const numberString = this.source.slice(start, this.pos).replace(/_/g, "");
		if (numberString === "") {
			// This can happen if a prefix is not followed by any digits (e.g., just '$')
			// We can treat it as an operator or throw an error. For now, let's assume it's not a number.
			// We need to rewind the position to before the prefix was scanned.
			this.pos = start - (radix === 10 ? 0 : radix === 16 && secondChar === "x" ? 2 : 1);
			return this.scanIdentifier(line, column); // Re-evaluate as something else
		}

		let numericValue = Number.parseInt(numberString, radix);
		if (negative) numericValue = -numericValue;

		return this.makeToken("NUMBER", String(numericValue), line, column, radix === 16 ? `$${numberString}` : radix === 2 ? `%${numberString}` : numberString);
	}

	private scanLocalLabel(line: number, column: number, _char: string): Token {
		this.advance(); // consume local label char
		const nextChar = this.peek();

		if (this.isAlpha(nextChar)) {
			// Named local label like ':loop'
			const start = this.pos;
			while (this.isIdentifierPart(this.peek())) {
				this.advance();
			}
			const value = this.source.slice(start, this.pos);
			return this.makeToken("LOCAL_LABEL", value.toUpperCase(), line, column);
		}
		if (nextChar === "+" || nextChar === "-") {
			// Nameless reference like ':-' or ':++' or ':+3'
			const _start = this.pos;
			const sign = nextChar;
			let count = 0;
			while (this.peek() === sign) {
				this.advance();
				count++;
			}

			// Check for an optional numeric count like ':-3'
			if (this.isDigit(this.peek())) {
				const numStart = this.pos;
				while (this.isDigit(this.peek())) {
					this.advance();
				}
				const numStr = this.source.slice(numStart, this.pos);
				count = Number.parseInt(numStr, 10);
			}

			const value = `${sign}${count}`; // e.g., "-1", "+2", "-3"
			return this.makeToken("ANONYMOUS_LABEL_REF", value, line, column);
		}
		// It's a standalone nameless label definition ':'
		// The colon has already been consumed.
		// We need to check if it's followed by a colon, which would make it a '::' operator for namespacing.
		// For now, we assume it's a definition and use the standard ":" value for the token.
		return this.makeToken("ANONYMOUS_LABEL_DEF", ":", line, column);
	}

	private scanRawTextBlock(line: number, column: number, endMarker: string): Token | null {
		// The raw data starts after the current line.
		const endOfLine = this.source.indexOf("\n", this.pos);
		// No newline after the directive, so no raw data.
		if (endOfLine === -1) return null;

		const rawDataStart = endOfLine + 1;

		// Find the end marker, which can be preceded by whitespace on its own line.
		let currentPos = rawDataStart;
		let endOfRawData = -1;

		do {
			let lineStart = currentPos + 1;
			// Skip leading whitespace on the line
			while (lineStart < this.length && (this.source[lineStart] === " " || this.source[lineStart] === "\t")) {
				lineStart++;
			}

			if (this.source.startsWith(endMarker, lineStart)) {
				endOfRawData = currentPos; // The raw data ends at the newline before the end marker line.
				this.pos = lineStart + endMarker.length; // Move position past the end marker
				break;
			}
			currentPos++; // Move to the next character to continue searching
			// biome-ignore lint/suspicious/noAssignInExpressions: easier that way
		} while ((currentPos = this.source.indexOf("\n", currentPos)) !== -1);

		if (endOfRawData === -1) {
			endOfRawData = this.length; // Read to the end if marker not found
			this.pos = this.length;
		}

		const rawValue = this.source.slice(rawDataStart, endOfRawData);
		return this.makeToken("RAW_TEXT", rawValue, line, column);
	}

	private scanIdentifier(line: number, column: number): Token {
		let start = this.pos;

		// Scan identifier: letters, digits, underscore, and dot (for addressing modes like LDA.W)
		while (this.isIdentifierPart(this.peek())) this.advance();

		let value = this.source.slice(start, this.pos);

		// Check if followed by : - that makes it a label
		if (this.peek() === ":") {
			this.advance(); // consume ':'

			value = value.toUpperCase();

			// Check if followed by :: - that makes it a namespace::symbol
			if (this.peek() === ":") {
				this.advance(); // consume ':'

				start = this.pos;
				const ch = this.source[this.pos];
				if (this.isIdentifierStart(ch)) while (this.isIdentifierPart(this.peek())) this.advance();
				const symbolName = this.source.slice(start, this.pos);

				return this.makeToken("IDENTIFIER", `${value}::${symbolName.toUpperCase()}`, line, column, symbolName);
			}

			return this.makeToken("LABEL", value, line, column);
		}

		// Otherwise it's just an identifier (could be instruction, symbol, macro name, etc.)
		return this.makeToken("IDENTIFIER", value.toUpperCase(), line, column, value);
	}

	private isValidDigitForRadix(ch: string, radix: number): boolean {
		if (radix === 16) return this.isHexDigit(ch);
		if (radix === 2) return ch === "0" || ch === "1";
		return this.isDigit(ch); // radix 10
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
		return this.isAlphaNumeric(ch) || ch === "_";
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
	public getPosition() {
		return { line: this.line, column: this.column, pos: this.pos };
	}

	private makeToken(type: Exclude<TokenType, "ARRAY">, value: string, line = this.line, column = this.column, raw?: string): Token {
		return { type, value, line, column, raw } as Token;
	}
}
