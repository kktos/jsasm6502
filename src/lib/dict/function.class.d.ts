import { BaseDict } from "./base.class";
import { TDict } from "./base.type";
export declare class FunctionDict<T extends TDict> {
    private base;
    private fnStack;
    current: string | null;
    constructor(base: BaseDict<T>);
    private getFunctionDict;
    has(name: string): boolean;
    declare(name: string): void;
    enter(name: string): void;
    leave(): void;
    isOneActive(): boolean;
}
