export type TMacro = {
    parms: string[];
    block: string;
    hasRestParm: boolean;
};
export declare class MacroManager {
    private macros;
    add(name: string, macro: TMacro): void;
    get(name: string): TMacro;
    exists(name: string): boolean;
}
