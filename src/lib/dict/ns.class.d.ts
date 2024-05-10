import { BaseDict } from "./base.class";
import { TDict } from "./base.type";
export declare class NSDict<T extends TDict> {
    private base;
    private nsStack;
    constructor(base: BaseDict<T>);
    has(name: string): boolean;
    select(nsName?: string): void;
    unselect(): void;
    isGlobalSelected(): boolean;
}
