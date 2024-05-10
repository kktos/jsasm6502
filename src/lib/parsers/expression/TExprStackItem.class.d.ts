import { Token } from "../../lexer/token.class";
import { IExprItem } from "../../types/ExprItem.type";
import { TValue, TValueType } from "../../types/Value.type";
import { TExprStackOperation } from "./expression.type";
type TExtra = {
    file?: string;
    line?: number;
    isVariable: boolean;
    exported?: number;
};
type DumpOptions = {
    withType: boolean;
};
export declare class TExprStackItem implements IExprItem {
    val: TValue;
    op?: TExprStackOperation;
    fn?: string;
    paramCount?: number;
    extra?: TExtra;
    static newFunction(name: string, paramCount: number): TExprStackItem;
    static newNumber(value: number): TExprStackItem;
    static newString(value: string): TExprStackItem;
    static newObject(value: Record<string, unknown>): TExprStackItem;
    static newArray(value: unknown[]): TExprStackItem;
    static fromToken(tok: Token): TExprStackItem;
    static duplicate(item: TExprStackItem): TExprStackItem;
    constructor(typeOrToken: number | Token, value: TValueType, op?: TExprStackOperation);
    renew(type: number, value: TValueType): void;
    get type(): number;
    get typeAsString(): string;
    get value(): TValueType;
    get number(): number;
    set number(v: number);
    get isDefined(): boolean;
    get string(): string;
    get array(): unknown[];
    static asString(obj: TExprStackItem, options?: DumpOptions): string;
    toString(): string;
}
export {};
