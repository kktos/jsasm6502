import { Context } from "../context.class";
import { TExprStackItem } from "./expression/TExprStackItem.class";
export type TFunctionFlags = {
    allowUndef?: boolean;
    minParmCount?: number;
    maxParmCount?: number;
};
export declare function isFunctionExists(name: string): boolean;
export declare function fnParmCount(name: string): {
    minParmCount: number;
    maxParmCount: number;
};
export declare function fnFlags(name: string): TFunctionFlags;
export declare function execFunction(ctx: Context, name: string, parms: (TExprStackItem | undefined)[]): TExprStackItem;
