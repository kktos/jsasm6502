import { BaseDict } from "./base.class";
import { TDict } from "./base.type";
export declare class OverrideDict<T extends TDict> {
    private base;
    constructor(base: BaseDict<T>);
    override(name: string, value: T): void;
    restore(name: string): void;
}
