import { BaseDict } from "./base.class";
import { TDict } from "./base.type";
export declare class ExportDict<T extends TDict> {
    private base;
    constructor(base: BaseDict<T>);
    one(name: string): void;
    many(regex: string): number;
    isExported(name: string, ns?: string): boolean;
}
