import { Context } from "../context.class";
import { Token } from "../lexer/token.class";
import { TExprStackItem } from "./expression/TExprStackItem.class";
export declare function parseLocalLabel(ctx: Context): any;
export declare function addLabel(ctx: Context, name: string, value: TExprStackItem): void;
export declare function parseLabel(ctx: Context, token: Token): {
    name: string;
    value: TExprStackItem;
};
