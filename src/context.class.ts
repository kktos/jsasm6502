import { Compiler } from "./compiler.class";
import { Dict } from "./dict.class";
import { CharMapManager } from "./helpers/charMapManager";
import { VAParseError } from "./helpers/errors.class";
import { MacroManager } from "./helpers/macroManager";
import { EVENT_TYPES, Lexer } from "./lexer/lexer.class";
import { Options, TConsole } from "./types/Options";

type LexerStackItem = {
	filename: string | null;
	filepath: string | null;
};

export class Context {
	public filename = "";
	public filepath = "";
	public pass = 1;
	public lexerStack: LexerStackItem[] = [];
	public wannaStop = false;
	public opcodes: Record<string, number[]> = {};
	public cpu = "??";
	public _readFile;
	public YAMLparse;
	public _mainFile;
	public wannaListing;
	public macros = new MacroManager();
	public console: TConsole;
	public code: Compiler;

	// public symbols = new Dict();
	// public charMapManager = new CharMapManager(this.symbols);
	// public lexer = new Lexer({charMapManager:this.charMapManager});

	public lastLabel: string | null = null;
	private _deferredMsg: string | null = null;

	constructor(
		opts: Options,
		mainFile: string,
		public symbols = new Dict(),
		public charMapManager = new CharMapManager(symbols),
		public lexer = new Lexer({ charMapManager: charMapManager }),
	) {
		this._readFile = opts.readFile;
		this.YAMLparse = opts.YAMLparse;
		this._mainFile = mainFile;
		this.wannaListing = opts.listing;

		this.console = opts.console ? opts.console : (console as unknown as TConsole);
		globalThis.console = this.console as unknown as Console;

		this.code = new Compiler(opts.segments);

		// this.lastLabel= null;
		// this.pushFile(mainFile);
		// this._deferredMsg= "";
		this.reset();
	}

	pushFile(file: string, fromFile?: string) {
		// console.log("CONTEXT PUSH", file);

		const { path, content, error } = this._readFile(file, fromFile, false);

		if (error) {
			throw new VAParseError(error);
		}

		this.lexerStack.push({
			filename: this.filename,
			filepath: this.filepath,
		});
		this.filename = file;
		this.filepath = path;

		this.lexer.pushSource(content as string);

		this.lexer.addEventListener(EVENT_TYPES.EOS, () => {
			const lexCtx = this.lexerStack.pop();

			// console.log("CONTEXT EOS", this.filename, lexCtx.filename);

			if (!lexCtx) return;
			// if (!lexCtx.filename) throw new VAParseError("No filename for LexerContext");
			// if (!lexCtx.filepath) throw new VAParseError("No filepath for LexerContext");

			this.filename = lexCtx.filename ?? "--";
			this.filepath = lexCtx.filepath ?? "--";
		});
	}

	reset() {
		this.pushFile(this._mainFile);
		this.code.reset();
		this._deferredMsg = "";
		this.lastLabel = null;
		this.symbols.select();
	}

	print(msg: string, wantItDeferred = false) {
		if (wantItDeferred) {
			this._deferredMsg += `${msg}\n`;
			return;
		}
		if (this.pass < 2) return;

		this.wannaListing && console.log(msg);

		if (this._deferredMsg !== "") {
			this.console.log(this._deferredMsg);
			this._deferredMsg = "";
		}
	}

	warn(msg: string) {
		this.console.warn(`WARNING : ${msg}`);
	}

	error(msg: string) {
		if (this._deferredMsg !== "") {
			this.console.log(this._deferredMsg);
			this._deferredMsg = "";
		}

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
