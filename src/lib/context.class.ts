import { Compiler } from "./compiler.class";
import { Dict } from "./dict/dict.class";
import { CharMapManager } from "./helpers/charMapManager";
import { VAParseError } from "./helpers/errors.class";
import { MacroManager } from "./helpers/macroManager";
import { EVENT_TYPES, Lexer } from "./lexer/lexer.class";
import type { TExprStackItem } from "./parsers/expression/TExprStackItem.class";
import type { Options, ReadFileFunction, TConsole } from "./types/Options.type";

const log = console.log;

type LexerStackItem = {
	filename: string | null;
	filepath: string | null;
};

export class Context {
	public filename: string | null = null;
	public filepath = "";
	public pass = 1;
	public lexerStack: LexerStackItem[] = [];
	public wannaStop = false;
	public opcodes: Record<string, number[]> = {};
	public cpu = "??";
	public _readFile: ReadFileFunction;
	public YAMLparse;
	public _mainFile;
	public wannaListing;
	public macros = new MacroManager();
	public console: TConsole;
	public code: Compiler;
	public symbols: Dict<TExprStackItem>;
	public charMapManager: CharMapManager<TExprStackItem>;
	public lexer: Lexer;

	public filesDir: Record<string, string> = {};

	public lastLabel: { name: string; value: TExprStackItem } | null = null;
	// private _deferredMsg: string | null = null;

	public needNewline = true;

	static createContext(opts: Options, src: string | { name: string; content: string }) {
		const symbols = Dict.newDict<TExprStackItem>();
		const charMapManager = new CharMapManager(symbols);
		const lexer = new Lexer({ charMapManager: charMapManager });
		return new Context(opts, src, symbols, charMapManager, lexer);
	}

	constructor(
		opts: Options,
		src: string | { name: string; content: string },
		symbols: Dict<TExprStackItem>,
		charMapManager: CharMapManager<TExprStackItem>,
		lexer: Lexer,
	) {
		this.lexer = lexer;
		this.symbols = symbols;
		this.charMapManager = charMapManager;

		this._readFile = opts.readFile;
		this.YAMLparse = opts.YAMLparse;
		this._mainFile = src;
		this.wannaListing = opts.listing;

		this.console = opts.console ? opts.console : (console as unknown as TConsole);
		globalThis.console = this.console as unknown as Console;

		this.code = new Compiler(opts.segments);

		this.reset();
	}

	pushFile(file: string | { name: string; content: string }, fromFile?: string) {
		// console.log("CONTEXT PUSH", file);

		const filename = typeof file === "string" ? file : file.name;
		const wd = fromFile ? this.filesDir[fromFile] : "";

		// log("pushFile", file, "FROM", fromFile, "WD", wd);

		const { path, dir, content, error } =
			typeof file === "string"
				? this._readFile(file, wd, false)
				: { path: file.name, dir: "", content: file.content, error: "" };

		if (error) {
			throw new VAParseError(error);
		}
		this.filesDir[filename] = dir;

		this.lexerStack.push({
			filename: this.filename,
			filepath: this.filepath,
		});

		this.filename = filename;
		this.filepath = path;

		// log("pushFile", filename);

		this.lexer.pushSource(content as string);

		this.lexer.addEventListener(EVENT_TYPES.EOS, () => {
			// log("CONTEXT lexerStack", JSON.stringify(this.lexerStack));

			const lexCtx = this.lexerStack.pop();

			this.filename = lexCtx?.filename ?? null;
			this.filepath = lexCtx?.filepath ?? "";

			// log("CONTEXT EOS", {filename:this.filename, filepath:this.filepath});
		});
	}

	reset() {
		this.lexer.reset();
		this.pushFile(this._mainFile);
		this.code.reset();
		// this._deferredMsg = "";
		this.lastLabel = null;
		this.symbols.ns.select(); // .nsSelect();
	}

	print(msg: string, wantItDeferred = false) {
		// if (wantItDeferred) {
		// 	this._deferredMsg += `${msg}\n`;
		// 	return;
		// }
		if (this.pass < 2) return;

		this.wannaListing && this.console.log(msg);
		// this.wannaListing && console.log(msg);

		// if (this._deferredMsg !== "") {
		// 	this.console.log(this._deferredMsg);
		// 	this._deferredMsg = "";
		// }
	}

	warn(msg: string) {
		this.console.warn(`WARNING : ${msg}`);
	}

	error(msg: string) {
		// if (this._deferredMsg !== "") {
		// 	this.console.log(this._deferredMsg);
		// 	this._deferredMsg = "";
		// }

		const { posInLine, line: lineIdx } = this.lexer.pos();
		const line = this.lexer.line();
		this.console.error(
			`\n${msg} in ${this.filepath} at line ${lineIdx} at ${posInLine}\n${line?.slice(0, posInLine)}<>${line?.slice(
				posInLine + 1,
			)}`,
		);
		// this.lexer.stopSource();
	}
}
