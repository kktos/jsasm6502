import { CharMapManager } from "../helpers/charMapManager";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
import { Token } from "./token.class";
export declare enum EVENT_TYPES {
    EOS = "EOS"
}
type TEVENT_TYPES = keyof typeof EVENT_TYPES;
export type LexerHelpers = {
    charMapManager: CharMapManager<TExprStackItem>;
};
type TEventListenerHandler = () => void;
export declare class Lexer {
    private ctx;
    private contexts;
    private helpers;
    constructor(helpers: LexerHelpers);
    get id(): number;
    reset(): void;
    pushSource(src: string): void;
    popSource(): void;
    addEventListener(type: TEVENT_TYPES, listener: TEventListenerHandler): void;
    removeEventListener(type: TEVENT_TYPES, listener: TEventListenerHandler): void;
    executeEventListener(type: TEVENT_TYPES): void;
    stopSource(): void;
    nextLine(): boolean;
    keepOnLine(): void;
    saveState(): void;
    restoreState(): void;
    popState(): void;
    pos(): {
        posInLine: number;
        line: number;
    };
    line(): string;
    lines(): string[];
    eof(): boolean;
    isLookahead(tokenType: number, identifier?: string): boolean;
    lookahead(idx?: number): Token;
    lookaheadType(idx?: number): number;
    isIdentifier(identifier: string): boolean;
    isToken(tokenType: number): boolean;
    match(tokens: Array<number | null>): boolean;
    token(): Token;
    token2(): Token;
    tokenType(): number;
    next(): boolean;
    eol(): boolean;
    _tokenize(): void;
    private nextChar;
    _testLookaheadChars(chars: string): boolean;
    _testLookaheadChar(charset: Set<string>): boolean;
    _lookaheadChar(offset?: number): string;
    private consumeComment;
    _advance(): boolean;
    insertTokens(tokens: Token[]): void;
    get tokens(): Token[];
    dump(): string;
}
export {};
