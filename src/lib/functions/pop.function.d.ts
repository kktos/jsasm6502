import { Context } from "../context.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
export declare function fnPop(ctx: Context, parms: (TExprStackItem | undefined)[]): TExprStackItem;
