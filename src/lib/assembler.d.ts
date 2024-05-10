import { Options } from "./types/Options.type";
import { TAssemblerResult } from "./types/assembler.type";
export declare function assemble(src: string | {
    name: string;
    content: string;
}, opts: Options): TAssemblerResult;
