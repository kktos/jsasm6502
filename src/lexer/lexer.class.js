import { Token } from "./token.class.js";

const ALPHABET= [...Array(26)].map((_, i) => String.fromCharCode(i + 65));

const WS_CHARSET= new Set([" ", "\t"]);
const DIGITS_CHARSET= new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
const HEXA_CHARSET= new Set([...DIGITS_CHARSET, "A", "B", "C", "D", "E", "F"]);
const BINARY_CHARSET= new Set(["0", "1"]);
const IDENTIFIER_CHARSET= new Set([...ALPHABET, "_"]);
const IDENTIFIER_CHARSET2= new Set([...IDENTIFIER_CHARSET, ...DIGITS_CHARSET]);
const QUOTES_CHARSET= new Set([ "'", '"' ]);

export const EVENT_TYPES= {
	EOS: "EOS"
};

export const TOKEN_TYPES= {
	DOT: 0x100,
	HASH: 0x101,
	LEFT_PARENT: 0x102,
	RIGHT_PARENT: 0x103,
	COMMA: 0x104,
	COLON: 0x105,
	BANG: 0x106,
	AT: 0x107,
	LEFT_BRACKET: 0x108,
	RIGHT_BRACKET: 0x109,

	DOLLAR: 0x150,
	PERCENT: 0x151,
	
	IDENTIFIER: 0x200,
	NUMBER: 0x300,
	STRING: 0x400,

	ARRAY: 0x501,
	OBJECT: 0x502,
	
	// COMMENT: 0x500,
	
	LOWER: 0x600,
	GREATER: 0x601,
	EQUAL: 0x602,
	STAR: 0x603,
	SLASH: 0x604,
	PLUS: 0x605,
	MINUS: 0x606,

	AND: 0x607,
	OR: 0x608,

	INVALID: 0xFFF,

	EOF: 0x8000,
};
export const TOKEN_TYPES_ENTRIES= Object.entries(TOKEN_TYPES);

const SEPARATOR_TOKENS= {
	".": TOKEN_TYPES.DOT,
	"#": TOKEN_TYPES.HASH,
	"(": TOKEN_TYPES.LEFT_PARENT,
	")": TOKEN_TYPES.RIGHT_PARENT,
	",": TOKEN_TYPES.COMMA,
	":": TOKEN_TYPES.COLON,
	"!": TOKEN_TYPES.BANG,
	"@": TOKEN_TYPES.AT,
	"[": TOKEN_TYPES.LEFT_BRACKET,
	"]": TOKEN_TYPES.RIGHT_BRACKET,

	"&": TOKEN_TYPES.AND,
	"|": TOKEN_TYPES.OR,

	">": TOKEN_TYPES.GREATER,
	"<": TOKEN_TYPES.LOWER,
	"=": TOKEN_TYPES.EQUAL,
	"*": TOKEN_TYPES.STAR,
	"/": TOKEN_TYPES.SLASH,
	"+": TOKEN_TYPES.PLUS,
	"-": TOKEN_TYPES.MINUS,
};
const SEPARATOR_CHARSET= new Set(Object.keys(SEPARATOR_TOKENS));

class LexerContext {
	constructor(src) {
		this.lines= src ? src.split(/\r?\n/) : [];
		this.lineIdx= 0;
		this.states= [];		
		this.eventHandlers= {};
		
		this.nextLine();
	}

	nextLine() {
		this.currChar= null;
		this.posInLine= 0;
		this.currLine= null;
		this.currToken= null;
		this.tokens= [];
		this.curTokIdx= 0;
		this.tokCount= 0;
		this.comment= null;		
	}

}

export class Lexer {
	constructor() {
		this.ctx= null;
		this.contexts= [];
		// this.onEOF= null;
	}
	
	pushSource(src) {
		if(this.ctx)
			this.contexts.push(this.ctx);
		this.ctx= new LexerContext(src);
	}

	addEventListener(type, listener) {
		if(typeof listener != "function")
			throw new TypeError("FATAL ERROR: Lexer.addEventListener needs a function");

		if(!this.ctx.eventHandlers[type])
			this.ctx.eventHandlers[type]= [];
		this.ctx.eventHandlers[type].push(listener);

		// console.log("Lexer.addEventListener",type, listener);
		// console.log("Lexer.eventHandlers",this.ctx.eventHandlers);
	}
	removeEventListener(type, listener) {
		if(!this.ctx.eventHandlers[type])
			return;
		const idx= this.ctx.eventHandlers[type].indexOf(listener);

		// console.log("Lexer.removeEventListener",type, listener);
		// console.log("Lexer.eventHandlers",this.ctx.eventHandlers);

        if(idx > -1)
            this.ctx.eventHandlers[type].splice(idx, 1);		
	}
	executeEventListener(type) {
		for(const handler of this.ctx.eventHandlers[type])
			handler();
	}

	// cancel the rest of the source -> pragma .end
	stopSource() {
		this.ctx.lineIdx= this.ctx.lines.length;
	}

	nextLine() {

		while(true) {
			this.ctx.nextLine();
			
			if(this.ctx.lineIdx<this.ctx.lines.length)
				break;

			// console.log("Lexer.nextLine", this.ctx.eventHandlers);
			if(this.ctx.eventHandlers[EVENT_TYPES.EOS])
				this.executeEventListener(EVENT_TYPES.EOS);
				
			// if(this.onEOF)
			// 	this.onEOF();
				
			this.ctx= this.contexts.pop();
			if(!this.ctx)
				return false;
		}

		this.ctx.currLine= this.ctx.lines[this.ctx.lineIdx++];
		this._tokenize();

		// console.log("nextLine", this.tokens);
		return true;
	}

	saveState() {
		this.ctx.states.push([this.ctx.lineIdx, this.ctx.posInLine, this.ctx.currLine, this.ctx.currChar]);
	}

	restoreState() {
		[this.ctx.lineIdx, this.ctx.posInLine, this.ctx.currLine, this.ctx.currChar] = this.ctx.states.pop();
	}

	popState() {
		this.ctx.states.pop();
	}

	pos() {
		return {posInLine: this.ctx.posInLine, line: this.ctx.lineIdx};
	}
	line() {
		return this.ctx.currLine;
	}
	eof() {
		return this.ctx.lineIdx>=this.ctx.lines.length;
	}

	isLookahead(tokenType) {
        if(this.ctx.curTokIdx >= this.ctx.tokCount-1)
			return false;

        return this.ctx.tokens[this.ctx.curTokIdx + 1].type == tokenType;
	}

    lookahead(idx =1) {
		if(idx<0) {
			if(this.ctx.tokCount-idx<0)
				return false;
			return this.ctx.tokens[this.ctx.tokCount-idx];
		}
		
        if(this.ctx.curTokIdx >= this.ctx.tokCount-idx)
			return false;

        return this.ctx.tokens[this.ctx.curTokIdx + idx];
    }

    isIdentifier(identifier) {
        return	this.ctx.curTokIdx < this.ctx.tokCount &&
				TOKEN_TYPES.IDENTIFIER == this.ctx.tokens[this.ctx.curTokIdx].type &&
				identifier == this.ctx.tokens[this.ctx.curTokIdx].value;
    }

    isToken(tokenType) {
        return this.ctx.curTokIdx < this.ctx.tokCount ? tokenType == this.ctx.tokens[this.ctx.curTokIdx].type : false;
    }

    match(tokens) {
        return 	this.ctx.curTokIdx < this.ctx.tokCount &&
				tokens.includes(this.ctx.tokens[this.ctx.curTokIdx].type);
    }

    token() {
        if(this.ctx.curTokIdx >= this.ctx.tokCount)
            return false; //new Token(TOKEN_TYPES.EOF);

        return this.ctx.tokens[this.ctx.curTokIdx];
    }

	next() {
        this.ctx.curTokIdx++;
        return this.ctx.curTokIdx < this.ctx.tokCount;
    }

    eol() {
        return this.ctx.curTokIdx >= this.ctx.tokCount;
    }

    _tokenize() {
        while(this._advance()) {
			// console.log(this.currToken);
            this.ctx.tokens.push(this.ctx.currToken);
        }
        this.ctx.tokCount= this.ctx.tokens.length;
    }

	_nextChar() {
		if(this.ctx.posInLine>=this.ctx.currLine?.length)
			return this.ctx.currChar= null;
		this.ctx.currChar= this.ctx.currLine?.[this.ctx.posInLine++] ?? null;
	}
	
	_testLookaheadChar(charset) {
		if(this.ctx.posInLine>=this.ctx.currLine?.length)
			return false;
		return charset.has(this.ctx.currLine?.[this.ctx.posInLine].toUpperCase() ?? null);
	}

	_lookaheadChar() {
		if(this.ctx.posInLine>=this.ctx.currLine?.length)
			return null;
		return this.ctx.currLine?.[this.ctx.posInLine] ?? null;
	}

	_advance() {	
		this.ctx.currToken= new Token();

		// WHITESPACESs
		do {
			this._nextChar();
		} while(WS_CHARSET.has(this.ctx.currChar));

		if(this.ctx.currChar == null)
			return false;

		this.ctx.currToken.posInLine= this.ctx.posInLine-1;

		// SEPARATORS
		if(SEPARATOR_CHARSET.has(this.ctx.currChar)) {
			this.ctx.currToken.type= SEPARATOR_TOKENS[this.ctx.currChar];
			this.ctx.currToken.text= this.ctx.currChar;
			return true;
		}
	
		let startPos= this.ctx.posInLine-1;

		// IDENTIFIER
		if(IDENTIFIER_CHARSET.has(this.ctx.currChar.toUpperCase())) {
			while(this._testLookaheadChar(IDENTIFIER_CHARSET2))
				this._nextChar();
			this.ctx.currToken.type= TOKEN_TYPES.IDENTIFIER;
			this.ctx.currToken.text= this.ctx.currLine.slice(startPos, this.ctx.posInLine);
			this.ctx.currToken.value= this.ctx.currToken.text.toUpperCase();
			return true;
		}

		// NUMBER hexa: 0x binary: 0b base10: 0123
		if(this.ctx.currChar=="0") {
			let base= 10;
			let charset= DIGITS_CHARSET;

			if(this._lookaheadChar() == "x") {
				this._nextChar();
				base= 16;
				charset= HEXA_CHARSET;
				startPos+= 2;
			}

			if(this._lookaheadChar() == "b") {
				this._nextChar();
				base= 2;
				charset= BINARY_CHARSET;
				startPos+= 2;
			}

			while(this._testLookaheadChar(charset))
				this._nextChar();

			this.ctx.currToken.type= TOKEN_TYPES.NUMBER;
			this.ctx.currToken.text= this.ctx.currLine.slice(startPos, this.ctx.posInLine);
			this.ctx.currToken.value= parseInt(this.ctx.currToken.text, base);
			return true;
		}

		// NUMBER base10
		if(DIGITS_CHARSET.has(this.ctx.currChar)) {
			while(this._testLookaheadChar(DIGITS_CHARSET))
				this._nextChar();

			this.ctx.currToken.type= TOKEN_TYPES.NUMBER;
			this.ctx.currToken.text= this.ctx.currLine.slice(startPos, this.ctx.posInLine);
			this.ctx.currToken.value= parseInt(this.ctx.currToken.text);
			return true;
		}

		// NUMBER hexa
		if(this.ctx.currChar=="$") {
			while(this._testLookaheadChar(HEXA_CHARSET)) {
				this._nextChar();
			}
			const endPos= this.ctx.posInLine;

			// if no hexa digits after $, lets have the $ token instead
			if(endPos-startPos==1) {
				this.ctx.currToken.type= TOKEN_TYPES.DOLLAR;
				return true;	
			}

			this.ctx.currToken.type= TOKEN_TYPES.NUMBER;
			this.ctx.currToken.text= this.ctx.currLine.slice(startPos+1, this.ctx.posInLine);
			this.ctx.currToken.value= parseInt(this.ctx.currToken.text, 16);
			return true;
		}

		// NUMBER binary
		if(this.ctx.currChar=="%") {
			while(this._testLookaheadChar(BINARY_CHARSET))
				this._nextChar();

			const endPos= this.ctx.posInLine;

			// if no binary digits after %, lets have the % token instead
			if(endPos-startPos==1) {
				this.ctx.currToken.type= TOKEN_TYPES.PERCENT;
				return true;	
			}

			this.ctx.currToken.type= TOKEN_TYPES.NUMBER;
			this.ctx.currToken.text= this.ctx.currLine.slice(startPos+1, this.ctx.posInLine);
			this.ctx.currToken.value= parseInt(this.ctx.currToken.text, 2);
			return true;
		}

		if(QUOTES_CHARSET.has(this.ctx.currChar)) {
			this.saveState();
			const quote= this.ctx.currChar;
			while(this._lookaheadChar() != null && this._lookaheadChar() != quote)
				this._nextChar();

			// if no end quote, let's assume it's a number as char ( 'A = $41 or "A = $81)
			if(this._lookaheadChar() == null) {
				this.restoreState();

				// string with no char (EOL) - invalid
				if(this._lookaheadChar() == null) {
					this.ctx.currToken.type= TOKEN_TYPES.INVALID;
					this.ctx.currToken.value= this.ctx.currChar;
					this.ctx.currToken.text= this.ctx.currChar;
					return false;
				}

				this._nextChar();
				this.ctx.currToken.type= TOKEN_TYPES.NUMBER;
				this.ctx.currToken.text= quote+this.ctx.currChar;
				this.ctx.currToken.value= this.ctx.currChar.charCodeAt(0);
				return true;				
			}

			this.popState();
			this._nextChar();
			this.ctx.currToken.type= TOKEN_TYPES.STRING;
			this.ctx.currToken.value= this.ctx.currLine.slice(startPos+1, this.ctx.posInLine-1);
			this.ctx.currToken.text= quote + this.ctx.currToken.value + quote;
			return true;
		}

		// COMMENT
		if(this.ctx.currChar == ";") {
			this.comment= this.ctx.currLine.slice(startPos+1);
			this.ctx.currLine= "";
			return false;
		}

		this.ctx.currToken.type= TOKEN_TYPES.INVALID;
		this.ctx.currToken.value= this.ctx.currChar;
		this.ctx.currToken.text= this.ctx.currChar;
		return false;	
	}

}