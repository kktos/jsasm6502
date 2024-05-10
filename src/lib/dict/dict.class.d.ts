import { BaseDict } from "./base.class";
import { TDict, TNamespaceKey } from "./base.type";
import { ExportDict } from "./export.class";
import { FunctionDict } from "./function.class";
import { MarkerDict } from "./marker.class";
import { NSDict } from "./ns.class";
import { OverrideDict } from "./override.class";
export declare class Dict<T extends TDict> {
    private base;
    marker: MarkerDict<T>;
    override: OverrideDict<T>;
    ns: NSDict<T>;
    fn: FunctionDict<T>;
    private exp;
    static newDict<T extends TDict>(): Dict<T>;
    constructor(base: BaseDict<T>, marker: MarkerDict<T>, override: OverrideDict<T>, ns: NSDict<T>, fn: FunctionDict<T>, exp: ExportDict<T>);
    exists(name: string, ns?: string, fn?: string): any;
    search(name: string): string[];
    get namespace(): string;
    get(name: TNamespaceKey, ns?: string): T | undefined;
    set(name: TNamespaceKey, value: T): void;
    get export(): ExportDict<T>;
    dump(): string;
}
