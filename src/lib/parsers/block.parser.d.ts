import { Context } from "../context.class";
import { Lexer } from "../lexer/lexer.class";
export declare function isPragma(lexer: Lexer, pragma: string): boolean;
export type TReadBlockOptions = {
    splitToken?: string;
    isClikeBlock?: boolean;
    wantRaw?: boolean;
};
export declare function readBlock(ctx: Context, opts?: TReadBlockOptions): any[];
