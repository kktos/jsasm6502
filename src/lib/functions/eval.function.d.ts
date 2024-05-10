import { Context } from "../context.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
export declare function fnEval(ctx: Context, parms: (TExprStackItem | undefined)[]): TExprStackItem;
