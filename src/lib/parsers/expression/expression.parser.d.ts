import { Context } from "../../context.class";
import { TExprStackItem } from "./TExprStackItem.class";
export declare function parseExpression(ctx: Context, endSet?: Set<number>, expectedType?: number): TExprStackItem | undefined;
export declare function parseExpressionAsNumber(ctx: Context, endSet?: Set<number>): TExprStackItem;
