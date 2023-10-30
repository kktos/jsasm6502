import { CharMapManager } from "../helpers/charMapManager";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES, Token } from "./token.class";

const log = console.log;

const ALPHABET = [...Array(26)].map((_, i) => String.fromCharCode(i + 65));

const WS_CHARSET = new Set([" ", "\t"]);
const DIGITS_CHARSET = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
const HEXA_CHARSET = new Set([...DIGITS_CHARSET, "A", "B", "C", "D", "E", "F"]);
const BINARY_CHARSET = new Set(["0", "1"]);
const IDENTIFIER_CHARSET = new Set([...ALPHABET, "_"]);
const IDENTIFIER_CHARSET2 = new Set([...IDENTIFIER_CHARSET, ...DIGITS_CHARSET]);
const QUOTES_CHARSET = new Set(["'", '"']);
const COMMENT_CHARSET = new Set(["/", "*"]);

export enum EVENT_TYPES {
	EOS = "EOS",
}

type TEVENT_TYPES = keyof typeof EVENT_TYPES;

const SEPARATOR_TOKENS: Record<string, number | [string, number, number]> = {
	".": ["..", TOKEN_TYPES.REST, TOKEN_TYPES.DOT],
	"#": TOKEN_TYPES.HASH,
	"(": TOKEN_TYPES.LEFT_PARENT,
	")": TOKEN_TYPES.RIGHT_PARENT,
	",": TOKEN_TYPES.COMMA,
	":": TOKEN_TYPES.COLON,
	"!": TOKEN_TYPES.BANG,
	"@": TOKEN_TYPES.AT,
	"[": TOKEN_TYPES.LEFT_BRACKET,
	"]": TOKEN_TYPES.RIGHT_BRACKET,

	"&": ["&", TOKEN_TYPES.AND, TOKEN_TYPES.BAND],
	"|": ["|", TOKEN_TYPES.OR, TOKEN_TYPES.BOR],
	"^": TOKEN_TYPES.BXOR,

	">": TOKEN_TYPES.GREATER,
	"<": TOKEN_TYPES.LOWER,
	"=": TOKEN_TYPES.EQUAL,
	"*": TOKEN_TYPES.STAR,
	"/": TOKEN_TYPES.SLASH,
	"+": TOKEN_TYPES.PLUS,
	"-": TOKEN_TYPES.MINUS,
};
const SEPARATOR_CHARSET = new Set(Object.keys(SEPARATOR_TOKENS));

type LexerState = {
	lineIdx: number;
	posInLine: number;
	currLine: string;
	currChar: string | null;
};

export type LexerHelpers = {
	charMapManager: CharMapManager;
};

type TEventListenerHandler = () => void;

class LexerContext {
	public lines: string[];
	public lineIdx = 0;
	public states: LexerState[] = [];
	public eventHandlers: Map<TEVENT_TYPES, TEventListenerHandler[]> = new Map();

	public posInLine = 0;
	public currChar: string | null = null;
	public currLine = "";
	public currToken = new Token();
	public tokens: Token[] = [];
	public curTokIdx = 0;
	public tokCount = 0;
	public comment: string | null = null;

	constructor(src: string) {
		this.lines = src ? src.split(/\r?\n/) : [];
		this.nextLine();
	}

	nextLine() {
		this.currChar = null;
		this.posInLine = 0;
		this.currLine = "";
		this.tokens = [];
		this.curTokIdx = 0;
		this.tokCount = 0;
		this.comment = null;
	}
}

export class Lexer {
	private ctx: LexerContext;
	private contexts: LexerContext[];
	private helpers: LexerHelpers;

	constructor(helpers: LexerHelpers) {
		this.ctx = new LexerContext("");
		this.contexts = [];
		this.helpers = helpers;
	}

	pushSource(src: string) {
		this.contexts.push(this.ctx);
		this.ctx = new LexerContext(src);
	}

	addEventListener(type: TEVENT_TYPES, listener: TEventListenerHandler) {
		const listeners = this.ctx.eventHandlers.get(type) ?? [];
		this.ctx.eventHandlers.set(type, listeners);
		listeners.push(listener);

		// console.log("Lexer.addEventListener",type, listener);
		// console.log("Lexer.eventHandlers",this.ctx.eventHandlers);
	}
	removeEventListener(type: TEVENT_TYPES, listener: TEventListenerHandler) {
		const listeners = this.ctx.eventHandlers.get(type);
		if (!listeners) return;

		const idx = listeners.indexOf(listener);

		// console.log("Lexer.removeEventListener",type, listener);
		// console.log("Lexer.eventHandlers",this.ctx.eventHandlers);

		if (idx > -1) listeners.splice(idx, 1);
	}
	executeEventListener(type: TEVENT_TYPES) {
		const listeners = this.ctx.eventHandlers.get(type);
		if (!listeners) return;

		for (const handler of listeners) handler();
	}

	// cancel the rest of the source -> pragma .end
	stopSource() {
		this.ctx.lineIdx = this.ctx.lines.length;
	}

	nextLine() {
		while (true) {
			this.ctx.nextLine();

			// log("nextLine", this.ctx.lineIdx, this.ctx.lines.length);

			if (this.ctx.lineIdx < this.ctx.lines.length) break;

			// log("Lexer.nextLine", this.ctx.eventHandlers);
			if (this.ctx.eventHandlers.get(EVENT_TYPES.EOS)) this.executeEventListener(EVENT_TYPES.EOS);

			// if(this.onEOF)
			// 	this.onEOF();

			// this.ctx = this.contexts.pop() ?? null;
			const lastCtx = this.contexts.pop() ?? null;

			if (lastCtx) {
				this.ctx = lastCtx;
			} else {
				return false;
			}
			// log("Lexer.nextLine ctx", this.ctx);
		}

		this.ctx.currLine = this.ctx.lines[this.ctx.lineIdx++];

		// log("nextLine", this.ctx.currLine);

		this._tokenize();

		// console.log("nextLine", this.ctx.tokens);
		return true;
	}

	saveState() {
		this.ctx.states.push({
			lineIdx: this.ctx.lineIdx,
			posInLine: this.ctx.posInLine,
			currLine: this.ctx.currLine,
			currChar: this.ctx.currChar,
		});
	}

	restoreState() {
		const previousState = this.ctx.states.pop();
		if (!previousState) throw new VAParseError("No Lexer Previous State");

		({
			lineIdx: this.ctx.lineIdx,
			posInLine: this.ctx.posInLine,
			currLine: this.ctx.currLine,
			currChar: this.ctx.currChar,
		} = previousState);
	}

	popState() {
		this.ctx.states.pop();
	}

	pos() {
		return { posInLine: this.ctx.posInLine, line: this.ctx.lineIdx };
	}
	line() {
		return this.ctx.currLine;
	}
	eof() {
		return this.ctx.lineIdx >= this.ctx.lines.length;
	}

	isLookahead(tokenType: number, identifier?: string) {
		if (this.ctx.curTokIdx >= this.ctx.tokCount - 1) return false;

		const hasSameType = this.ctx.tokens[this.ctx.curTokIdx + 1].type === tokenType;

		return hasSameType && (identifier ? this.ctx.tokens[this.ctx.curTokIdx + 1].value === identifier : true);
	}

	lookahead(idx = 1) {
		if (idx < 0) {
			if (this.ctx.tokCount - idx < 0) return null;
			return this.ctx.tokens[this.ctx.tokCount - idx];
		}

		if (this.ctx.curTokIdx >= this.ctx.tokCount - idx) return null;

		return this.ctx.tokens[this.ctx.curTokIdx + idx];
	}

	lookaheadType(idx = 1) {
		return this.lookahead(idx)?.type ?? null;
	}

	isIdentifier(identifier: string) {
		return (
			this.ctx.curTokIdx < this.ctx.tokCount &&
			TOKEN_TYPES.IDENTIFIER === this.ctx.tokens[this.ctx.curTokIdx].type &&
			identifier === this.ctx.tokens[this.ctx.curTokIdx].value
		);
	}

	isToken(tokenType: number) {
		return this.ctx.curTokIdx < this.ctx.tokCount ? tokenType === this.ctx.tokens[this.ctx.curTokIdx].type : false;
	}

	match(tokens: Array<number | null>) {
		return this.ctx.curTokIdx < this.ctx.tokCount && tokens.includes(this.ctx.tokens[this.ctx.curTokIdx].type);
	}

	token() {
		if (this.ctx.curTokIdx >= this.ctx.tokCount) return null; //new Token(TOKEN_TYPES.EOF);

		return this.ctx.tokens[this.ctx.curTokIdx];
	}

	token2() {
		if (this.ctx.curTokIdx >= this.ctx.tokCount) throw new VAParseError("No more token !?!");

		return this.ctx.tokens[this.ctx.curTokIdx];
	}

	tokenType() {
		return this.token()?.type ?? null;
	}

	next() {
		this.ctx.curTokIdx++;
		return this.ctx.curTokIdx < this.ctx.tokCount;
	}

	eol() {
		return this.ctx.curTokIdx >= this.ctx.tokCount;
	}

	_tokenize() {
		while (this._advance()) {
			// console.log("_tokenize", this.ctx.currToken);
			this.ctx.tokens.push(this.ctx.currToken);
		}
		this.ctx.tokCount = this.ctx.tokens.length;
	}

	private nextChar() {
		if (this.ctx.posInLine >= this.ctx.currLine?.length) {
			this.ctx.currChar = null;
			return null;
		}
		this.ctx.currChar = this.ctx.currLine?.[this.ctx.posInLine++] ?? null;
		return this.ctx.currChar;
	}

	_testLookaheadChars(chars: string) {
		if (this.ctx.posInLine + chars.length >= this.ctx.currLine?.length) return false;
		let charIdx = 0;
		while (
			charIdx < chars.length &&
			chars[charIdx] === this.ctx.currLine?.[this.ctx.posInLine + charIdx].toUpperCase()
		) {
			charIdx++;
		}

		return charIdx === chars.length;
	}

	_testLookaheadChar(charset: Set<string>) {
		if (this.ctx.posInLine >= this.ctx.currLine?.length) return false;
		return charset.has(this.ctx.currLine?.[this.ctx.posInLine].toUpperCase() ?? null);
	}

	_lookaheadChar(offset = 0) {
		if (this.ctx.posInLine + offset >= this.ctx.currLine?.length) return null;
		return this.ctx.currLine?.[this.ctx.posInLine + offset] ?? null;
	}

	private consumeComment(start: number) {
		const commentCharsLen = this.ctx.currChar === ";" ? 1 : 2;
		const isMultiLines = commentCharsLen > 1 && this._lookaheadChar(0) === "*";
		let startPos: number = start + commentCharsLen;

		if (isMultiLines) {
			let comments = "";
			comments = "";
			this.nextChar();
			while (!this.eof()) {
				while (this.nextChar()) {
					if (this.ctx.currChar === "*" && this._lookaheadChar(0) === "/") {
						comments += this.ctx.currLine.slice(startPos, -2);
						return false;
					}
				}

				comments += this.ctx.currLine.slice(startPos);
				this.ctx.nextLine();
				this.ctx.currLine = this.ctx.lines[this.ctx.lineIdx++];

				startPos = 0;
			}

			throw new VAParseError("Unclosed Comments");
		} else {
			this.ctx.comment = this.ctx.currLine.slice(startPos);
		}
	}

	_advance() {
		this.ctx.currToken = new Token();

		this.nextChar();

		// WHITESPACESs
		while (this.ctx.currChar && WS_CHARSET.has(this.ctx.currChar)) {
			this.ctx.currToken.hasSpaceBefore = true;
			this.nextChar();
		}

		if (this.ctx.currChar == null) return false;

		this.ctx.currToken.posInLine = this.ctx.posInLine - 1;

		let startPos = this.ctx.posInLine - 1;

		// COMMENT

		if (this.ctx.currChar === ";" || (this.ctx.currChar === "/" && this._testLookaheadChar(COMMENT_CHARSET))) {
			this.consumeComment(startPos);
			return false;
		}

		// SEPARATORS
		if (SEPARATOR_CHARSET.has(this.ctx.currChar)) {
			const sep = SEPARATOR_TOKENS[this.ctx.currChar];
			this.ctx.currToken.text = this.ctx.currChar;

			if (!Array.isArray(sep)) {
				this.ctx.currToken.type = sep;
				return true;
			}

			const nextChars = sep[0];
			if (this._testLookaheadChars(nextChars)) {
				for (let idx = nextChars.length; idx !== 0; idx--) this.nextChar();
				this.ctx.currToken.text += nextChars; //this.ctx.currChar;
				this.ctx.currToken.type = sep[1];
			} else this.ctx.currToken.type = sep[2];

			return true;
		}

		// IDENTIFIER
		if (IDENTIFIER_CHARSET.has(this.ctx.currChar.toUpperCase())) {
			while (this._testLookaheadChar(IDENTIFIER_CHARSET2)) this.nextChar();
			this.ctx.currToken.type = TOKEN_TYPES.IDENTIFIER;
			this.ctx.currToken.text = this.ctx.currLine.slice(startPos, this.ctx.posInLine);
			this.ctx.currToken.value = this.ctx.currToken.text.toUpperCase();
			return true;
		}

		// NUMBER hexa: 0x binary: 0b base10: 0123
		if (this.ctx.currChar === "0") {
			let base = 10;
			let charset = DIGITS_CHARSET;

			if (this._lookaheadChar() === "x") {
				this.nextChar();
				base = 16;
				charset = HEXA_CHARSET;
				startPos += 2;
			}

			if (this._lookaheadChar() === "b") {
				this.nextChar();
				base = 2;
				charset = BINARY_CHARSET;
				startPos += 2;
			}

			while (this._testLookaheadChar(charset)) this.nextChar();

			this.ctx.currToken.type = TOKEN_TYPES.NUMBER;
			this.ctx.currToken.text = this.ctx.currLine.slice(startPos, this.ctx.posInLine);
			this.ctx.currToken.value = parseInt(this.ctx.currToken.text, base);
			return true;
		}

		// NUMBER base10
		if (DIGITS_CHARSET.has(this.ctx.currChar)) {
			while (this._testLookaheadChar(DIGITS_CHARSET)) this.nextChar();

			this.ctx.currToken.type = TOKEN_TYPES.NUMBER;
			this.ctx.currToken.text = this.ctx.currLine.slice(startPos, this.ctx.posInLine);
			this.ctx.currToken.value = parseInt(this.ctx.currToken.text);
			return true;
		}

		// NUMBER hexa
		if (this.ctx.currChar === "$") {
			while (this._testLookaheadChar(HEXA_CHARSET)) {
				this.nextChar();
			}
			const endPos = this.ctx.posInLine;

			// if no hexa digits after $, lets have the $ token instead
			if (endPos - startPos === 1) {
				this.ctx.currToken.type = TOKEN_TYPES.DOLLAR;
				return true;
			}

			this.ctx.currToken.type = TOKEN_TYPES.NUMBER;
			this.ctx.currToken.text = this.ctx.currLine.slice(startPos + 1, this.ctx.posInLine);
			this.ctx.currToken.value = parseInt(this.ctx.currToken.text, 16);
			return true;
		}

		// NUMBER binary
		if (this.ctx.currChar === "%") {
			while (this._testLookaheadChar(BINARY_CHARSET)) this.nextChar();

			const endPos = this.ctx.posInLine;

			// if no binary digits after %, lets have the % token instead
			if (endPos - startPos === 1) {
				this.ctx.currToken.type = TOKEN_TYPES.PERCENT;
				return true;
			}

			this.ctx.currToken.type = TOKEN_TYPES.NUMBER;
			this.ctx.currToken.text = this.ctx.currLine.slice(startPos + 1, this.ctx.posInLine);
			this.ctx.currToken.value = parseInt(this.ctx.currToken.text, 2);
			return true;
		}

		if (QUOTES_CHARSET.has(this.ctx.currChar)) {
			this.saveState();

			const quote = this.ctx.currChar;
			while (this._lookaheadChar() != null && this._lookaheadChar() !== quote) this.nextChar();

			// if no end quote, let's assume it's a number as char
			if (this._lookaheadChar() == null) {
				this.restoreState();

				// string with no char (EOL) - invalid
				if (this._lookaheadChar() == null) {
					this.ctx.currToken.type = TOKEN_TYPES.INVALID;
					this.ctx.currToken.value = this.ctx.currChar;
					this.ctx.currToken.text = this.ctx.currChar;
					return false;
				}

				this.nextChar();
				this.ctx.currToken.type = TOKEN_TYPES.NUMBER;
				this.ctx.currToken.text = quote + this.ctx.currChar;
				this.ctx.currToken.value = this.helpers.charMapManager.convertChar(this.ctx.currChar.charCodeAt(0));
				return true;
			}

			this.popState();
			this.nextChar();
			this.ctx.currToken.type = TOKEN_TYPES.STRING;
			this.ctx.currToken.value = this.ctx.currLine.slice(startPos + 1, this.ctx.posInLine - 1);
			this.ctx.currToken.text = quote + this.ctx.currToken.value + quote;

			return true;
		}

		this.ctx.currToken.type = TOKEN_TYPES.INVALID;
		this.ctx.currToken.value = this.ctx.currChar;
		this.ctx.currToken.text = this.ctx.currChar;
		return false;
	}
}
