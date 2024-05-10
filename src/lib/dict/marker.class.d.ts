import { BaseDict } from "./base.class";
import { TDict } from "./base.type";
export declare const MARKERS: unique symbol;
export declare class MarkerDict<T extends TDict> {
    private base;
    constructor(base: BaseDict<T>);
    add(mark: number): void;
    findClosest(target: number, distance: number): number;
}
