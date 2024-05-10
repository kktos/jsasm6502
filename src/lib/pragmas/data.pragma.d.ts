import { Context } from "../context.class";
export declare function readHexLine(textLine: string, isFromBlock?: boolean): any[];
export declare function processHex(ctx: Context): boolean;
export declare function pushNumber(list: number[], num: number, endianSize: number): void;
export declare function processData(ctx: Context, pragma: string): boolean;
