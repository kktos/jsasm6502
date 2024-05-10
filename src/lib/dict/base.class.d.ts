import { TDict, TNamespaceDict, TNamespace, TNamespaceKey } from "./base.type";
export declare class BaseDict<T extends TDict> {
    namespaces: TNamespaceDict<T>;
    fn: TNamespace<T> | null;
    namespace: string;
    exports: Record<string, string>;
    static newBaseDict<T extends TDict>(): BaseDict<T>;
    constructor(namespaces: TNamespaceDict<T>, fn: TNamespace<T> | null);
    get global(): TNamespace<T>;
    get currNs(): TNamespace<T>;
    get(name: TNamespaceKey, ns?: string): T | undefined;
    set(name: TNamespaceKey, value: T): void;
    del(name: TNamespaceKey): void;
    search(name: string): string[];
    exists(name: string, ns?: string, fn?: string): any;
}
