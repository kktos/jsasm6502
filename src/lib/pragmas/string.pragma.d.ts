import { Context } from "../context.class";
type TStringOptions = {
    hasTrailingZero?: boolean;
    hasLeadingLength?: boolean;
    lengthSize?: number;
    charSize: number;
};
export declare function processText(ctx: Context, pragma: string): boolean;
export declare function makeString(ctx: Context | null, str: string, opts: TStringOptions): any[];
export {};
