import { Context } from "../context.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
export declare function fnDef(ctx: Context, parms: (TExprStackItem | undefined)[]): TExprStackItem;
export declare function fnUndef(ctx: Context, parms: (TExprStackItem | undefined)[]): TExprStackItem;
