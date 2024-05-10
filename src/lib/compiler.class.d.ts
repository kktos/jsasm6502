/// <reference types="node" />
type TSegment = {
    start: number;
    end: number;
    size: number;
    pad?: number;
};
export type TSegments = Record<string, TSegment>;
export type TCodeObj = Record<string, Array<unknown>>;
export declare class Compiler {
    pc: number;
    obj: TCodeObj;
    private _output;
    segments: TSegments;
    private currentSegment;
    constructor(segments: TSegments | null);
    get output(): string[];
    segment(): {
        start: number;
        end: number;
        size: number;
        pad?: number;
        name: string;
    };
    select(segmentName: string): void;
    setPC(addr: number): void;
    reset(): void;
    emits(pass: number, bytes: number[] | Buffer, wannaShowChars?: boolean): void;
    dump(segmentName: string, bytePerLine?: number): void;
}
export {};
