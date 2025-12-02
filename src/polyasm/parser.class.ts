import type { EventEmitter } from "node:events";
import type { AssemblyLexer, IdentifierToken, Token } from "./lexer/lexer.class";
import type { PushTokenStreamParams, StreamState } from "./polyasm.types";

export class Parser {
	public lexer: AssemblyLexer;
	public activeTokens: Token[] = [];
	public tokenStreamStack: StreamState[] = [];
	private streamIdCounter = 0;
	private tokenStreamCache: Map<string, StreamState> = new Map();
	public emitter: EventEmitter;

	constructor(lexer: AssemblyLexer, emitter: EventEmitter) {
		this.lexer = lexer;
		this.emitter = emitter;
	}

	public start(source: string): void {
		// Start streaming tokens instead of tokenizing the entire source.
		this.lexer.startStream(source);
		this.activeTokens = this.lexer.getBufferedTokens();

		// Initialize token stream stack so Pass 1 can use positional helpers.
		this.tokenStreamStack = [];
		this.streamIdCounter = 0;
		this.tokenStreamStack.push({
			id: this.streamIdCounter,
			tokens: this.activeTokens,
			index: 0,
		});
		this.activeTokens = this.tokenStreamStack[this.tokenStreamStack.length - 1].tokens;
	}

	public restart(): void {
		this.tokenStreamStack = [];
		this.streamIdCounter = 0;
		this.tokenStreamStack.push({
			id: this.streamIdCounter,
			tokens: this.activeTokens,
			index: 0,
		});
		this.activeTokens = this.tokenStreamStack[this.tokenStreamStack.length - 1].tokens;
	}

	/** Ensures a token at `index` is buffered and returns it. */
	public ensureToken(index: number): Token | null {
		// If the current activeTokens is the lexer's buffer, request buffering from lexer.
		const lexerBuffer = this.lexer.getBufferedTokens();
		if (this.activeTokens === lexerBuffer) {
			const t = this.lexer.ensureBuffered(index);
			// refresh reference in case lexer expanded the buffer
			this.activeTokens = this.lexer.getBufferedTokens();
			return t;
		}
		// Otherwise we're operating on a pushed token stream (macro/block) that's an array.
		return this.activeTokens[index] ?? null;
	}

	/** Get current stream position (internal index). */
	public getPosition(): number {
		if (this.tokenStreamStack.length === 0) return 0;
		return this.tokenStreamStack[this.tokenStreamStack.length - 1].index;
	}

	/** Set current stream position (internal index). */
	public setPosition(pos: number): void {
		if (this.tokenStreamStack.length === 0) return;
		this.tokenStreamStack[this.tokenStreamStack.length - 1].index = pos;
	}

	/** Peek relative to the current token pointer (0 == current). */
	public peekToken(offset = 0): Token | null {
		return this.ensureToken(this.getPosition() + offset);
	}

	public peekTokenUnbuffered(offset = 0): Token | null {
		const lexerPos = this.lexer.getPosition();
		const token = this.ensureToken(this.getPosition() + offset);
		this.lexer.rewind(offset + 1, lexerPos);
		return token;
	}

	/** Read and consume the next token from the active stream. */
	public nextToken(options?: { endMarker?: string }): Token | null {
		const pos = this.getPosition();
		if (options?.endMarker) this.lexer.setEndMarker(options.endMarker);
		const t = this.ensureToken(pos);
		if (options?.endMarker) this.lexer.setEndMarker(undefined);
		if (t) this.setPosition(pos + 1);
		return t;
	}

	public nextIdentifierToken(identifier?: string): IdentifierToken | null {
		const pos = this.getPosition();
		const t = this.ensureToken(pos);
		if (!t || t.type !== "IDENTIFIER" || (identifier && t.value !== identifier)) return null;
		this.setPosition(pos + 1);
		return t as IdentifierToken;
	}

	/** Advance the current token pointer by `n`. */
	public consume(n = 1): void {
		this.setPosition(this.getPosition() + n);
	}

	/** Slice tokens from start (inclusive) to end (exclusive) using buffered access. */
	public sliceTokens(start: number, end: number): Token[] {
		const out: Token[] = [];
		for (let i = start; i < end; i++) {
			const t = this.ensureToken(i);
			if (!t) break;
			out.push(t);
		}
		return out;
	}

	/** Returns all tokens on the current line starting at optional offset (relative). */
	public getLineTokens(offset = 0): Token[] {
		const out: Token[] = [];
		const base = this.getPosition() + offset;
		const start = this.ensureToken(base);
		if (!start) return out;
		const line = start.line;
		let i = base;
		while (true) {
			const t = this.ensureToken(i);
			if (!t) break;
			if (t.line !== line) break;
			out.push(t);
			i++;
		}
		return out;
	}

	/** Consumes tokens until the end of the current line (advances position to next line). */
	public consumeLine(): void {
		const startPos = this.getPosition();
		const startToken = this.ensureToken(startPos);
		if (!startToken) return;
		const line = startToken.line;
		let i = startPos;
		while (true) {
			const t = this.ensureToken(i);
			if (!t) break;
			i++;
			if (t.line !== line) break;
		}
		this.setPosition(i);
	}

	/** Returns the ID that will be used for the next stream. */
	public getNextStreamId(): number {
		return this.streamIdCounter + 1;
	}

	/** Pushes the current stream state and activates a new stream (macro/loop body). */
	public pushTokenStream({ newTokens, macroArgs, streamId, cacheName }: PushTokenStreamParams): number {
		// Save current position and arguments
		if (this.tokenStreamStack.length > 0) this.tokenStreamStack[this.tokenStreamStack.length - 1].index = this.getPosition();

		if (cacheName) {
			const cachedStream = this.tokenStreamCache.get(cacheName);
			if (cachedStream) {
				this.tokenStreamStack.push(cachedStream);
				this.activeTokens = cachedStream.tokens;
				this.setPosition(0);
				return cachedStream.id;
			}
		}

		const newStreamId = streamId ?? ++this.streamIdCounter;
		if (streamId) this.streamIdCounter = Math.max(this.streamIdCounter, streamId);

		// Push new context onto the stack
		this.tokenStreamStack.push({
			id: newStreamId,
			tokens: newTokens,
			index: 0,
			macroArgs,
			cacheName,
		});

		// Activate new stream
		this.activeTokens = newTokens;
		this.setPosition(0);
		return newStreamId;
	}

	/** Restores the previous stream state after a macro/loop finishes. */
	public popTokenStream(emitEvent = true): StreamState | undefined {
		const poppedStream = this.tokenStreamStack.pop();
		if (poppedStream && emitEvent) this.emitter.emit(`endOfStream:${poppedStream.id}`);

		if (poppedStream?.cacheName) this.tokenStreamCache.set(poppedStream.cacheName, poppedStream);

		if (this.tokenStreamStack.length > 0) {
			const previousState = this.tokenStreamStack[this.tokenStreamStack.length - 1];
			this.activeTokens = previousState.tokens;
			this.setPosition(previousState.index);
		}
		return poppedStream;
	}

	public getInstructionTokens(instructionToken?: Token): Token[] {
		const tokens: Token[] = [];

		const startToken = this.peekToken();
		if (startToken?.type === "EOF") return tokens;
		if (instructionToken && instructionToken.line !== startToken?.line) return tokens;

		this.consume(1);
		if (!startToken) return tokens;

		tokens.push(startToken);

		const startLine = instructionToken ? instructionToken.line : startToken.line;
		while (true) {
			let token = this.peekToken();
			if (!token) break;
			if (token.line !== startLine) break;
			if (token.type === "LBRACE" || token.type === "RBRACE" || token.type === "EOF") break;
			token = this.nextToken();
			if (token) tokens.push(token);
		}
		return tokens;
	}

	public getExpressionTokens(instructionToken?: Token): Token[] {
		const tokens: Token[] = [];
		let parenDepth = 0;

		const startToken = this.peekToken();
		if (!startToken || startToken.type === "EOF") return tokens;
		if (instructionToken && instructionToken.line !== startToken.line) return tokens;

		this.consume(1);
		tokens.push(startToken);

		if (startToken.value === "(") parenDepth++;
		if (startToken.value === ")") parenDepth--;

		const startLine = instructionToken ? instructionToken.line : startToken.line;
		while (true) {
			const token = this.peekToken();
			if (!token || token.line !== startLine || token.type === "LBRACE" || token.type === "RBRACE" || token.type === "EOF") {
				break;
			}

			if (token.value === "(") {
				parenDepth++;
			} else if (token.value === ")") {
				parenDepth--;
			} else if (token.type === "COMMA" && parenDepth <= 0) {
				break;
			}

			this.consume(1);
			tokens.push(token);
		}
		return tokens;
	}

	public getDirectiveBlockTokens(startDirective: string) {
		const tokens: Token[] = [];
		const blockDirectives = new Set(["MACRO", "IF", "FOR", "REPEAT", "NAMESPACE", "SEGMENT", "WHILE", "PROC", "SCOPE"]);
		let token = this.peekToken(0);
		let depth = token?.value === "{" ? 0 : 1;

		while (true) {
			token = this.peekToken(0);
			if (!token || token.type === "EOF") throw new Error(`[Assembler] Unterminated '${startDirective}' block.`);

			tokens.push(token);
			this.consume(1);

			switch (token.type) {
				case "DOT": {
					const nextToken = this.peekToken();
					if (nextToken?.type === "IDENTIFIER") {
						tokens.push(nextToken);
						this.consume(1);
						const directiveName = nextToken.value;
						if (blockDirectives.has(directiveName)) {
							const lineTokens = this.getInstructionTokens(nextToken);
							const blockToken = this.peekToken();
							if (blockToken?.type !== "LBRACE") depth++;
							tokens.push(...lineTokens);
							continue;
						}
						if (directiveName === "END") {
							depth--;
							if (depth === 0) return tokens.slice(0, -2);
						}
						continue;
					}
					break;
				}

				case "LBRACE":
					if (depth === 0) tokens.pop();
					depth++;
					break;
				case "RBRACE":
					depth--;
					if (depth === 0) return tokens.slice(0, -1);
					break;
			}
		}
	}

	public skipToEndOfLine(startIndex?: number): number {
		const start = startIndex ?? this.getPosition();
		const startToken = this.ensureToken(start);
		if (!startToken) return start;
		const startLine = startToken.line;
		let i = start + 1;
		while (true) {
			const t = this.ensureToken(i);
			if (!t) break;
			if (t.line !== startLine) break;
			if (t.type === "LBRACE" || t.type === "RBRACE") break;
			i++;
		}
		return i;
	}

	public skipToDirectiveEnd(startDirective: string): void {
		this.getDirectiveBlockTokens(startDirective);
	}
}
