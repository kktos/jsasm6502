import { Compiler } from "./compiler.class";
import { Dict } from "./dict/dict.class";
import { CharMapManager } from "./helpers/charMapManager";
import { MacroManager } from "./helpers/macroManager";
import { Lexer } from "./lexer/lexer.class";
import { TExprStackItem } from "./parsers/expression/TExprStackItem.class";
import { Options, TConsole } from "./types/Options.type";
type LexerStackItem = {
    filename: string | null;
    filepath: string | null;
};
export declare class Context {
    filename: string | null;
    filepath: string;
    pass: number;
    lexerStack: LexerStackItem[];
    wannaStop: boolean;
    opcodes: Record<string, number[]>;
    cpu: string;
    _readFile: any;
    YAMLparse: any;
    _mainFile: any;
    wannaListing: any;
    macros: MacroManager;
    console: TConsole;
    code: Compiler;
    symbols: Dict<TExprStackItem>;
    charMapManager: CharMapManager<TExprStackItem>;
    lexer: Lexer;
    filesDir: Record<string, string>;
    lastLabel: {
        name: string;
        value: TExprStackItem;
    } | null;
    needNewline: boolean;
    static createContext(opts: Options, src: string | {
        name: string;
        content: string;
    }): Context;
    constructor(opts: Options, src: string | {
        name: string;
        content: string;
    }, symbols: Dict<TExprStackItem>, charMapManager: CharMapManager<TExprStackItem>, lexer: Lexer);
    pushFile(file: string | {
        name: string;
        content: string;
    }, fromFile?: string): void;
    reset(): void;
    print(msg: string, wantItDeferred?: boolean): void;
    warn(msg: string): void;
    error(msg: string): void;
}
export {};
