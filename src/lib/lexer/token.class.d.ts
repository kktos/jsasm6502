import { TValue, TValueType } from "../types/Value.type";
export declare const TOKEN_TYPES: {
    DOT: number;
    HASH: number;
    LEFT_PARENT: number;
    RIGHT_PARENT: number;
    COMMA: number;
    COLON: number;
    BANG: number;
    AT: number;
    LEFT_BRACKET: number;
    RIGHT_BRACKET: number;
    LEFT_CURLY_BRACE: number;
    RIGHT_CURLY_BRACE: number;
    DOLLAR: number;
    PERCENT: number;
    IDENTIFIER: number;
    NUMBER: number;
    STRING: number;
    ARRAY: number;
    OBJECT: number;
    REST: number;
    EXPRESSION: number;
    LOWER: number;
    GREATER: number;
    EQUAL: number;
    STAR: number;
    SLASH: number;
    PLUS: number;
    MINUS: number;
    AND: number;
    OR: number;
    BAND: number;
    BOR: number;
    BXOR: number;
    INVALID: number;
    EOF: number;
};
export declare const TOKEN_TYPES_ENTRIES: [string, number][];
export declare class Token implements TValue {
    type: number | null;
    value: TValueType;
    text: string;
    posInLine: number;
    hasSpaceBefore: boolean;
    constructor(type?: number | null);
    get asString(): string;
    get asNumber(): number;
    toString(): string;
}
export declare function getTypeName(type: number): string;
export declare function tokenTypeOf(value: unknown): number;
