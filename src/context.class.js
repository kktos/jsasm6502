import { Compiler } from "./compiler.class.js";
import { Dict } from "./dict.class.js";
import { CharMapManager } from "./helpers/charMapManager.js";
import { VAParseError } from "./helpers/errors.class.js";
import { EVENT_TYPES, Lexer } from "./lexer/lexer.class.js";

export class Context {
	constructor(opts, mainFile) {
		this.filename = null;
		this.filepath = null;
		this.pass = 1;
		this.lexerStack = [];
		this.wannaStop = false;
		this.opcodes = null;
		this.cpu = "??";
		this._readFile = opts.readFile;
		this.YAMLparse = opts.YAMLparse;
		this._mainFile = mainFile;
		this.wannaListing = opts.listing;

		this.macros = {};

		this.console = opts.console ? opts.console : console;
		globalThis.console = this.console;

		this.code = new Compiler(opts.segments);
		this.symbols = new Dict();

		this.charMapManager = new CharMapManager(this.symbols);

		this.lexer = new Lexer({charMapManager:this.charMapManager});

		// this.lastLabel= null;
		// this.pushFile(mainFile);
		// this._deferredMsg= "";
		this.reset();
	}

	pushFile(file, fromFile) {
		// console.log("CONTEXT PUSH", file);

		const { path, content, error } = this._readFile(file, fromFile);

		if (error) {
			throw new VAParseError(error);
		}

		this.lexerStack.push({
			filename: this.filename,
			filepath: this.filepath,
		});
		this.filename = file;
		this.filepath = path;

		this.lexer.pushSource(content);

		this.lexer.addEventListener(EVENT_TYPES.EOS, () => {
			const lexCtx = this.lexerStack.pop();

			// console.log("CONTEXT EOS", this.filename, lexCtx.filename);

			if (!lexCtx) return;
			this.filename = lexCtx.filename;
			this.filepath = lexCtx.filepath;
		});
	}

	reset() {
		this.pushFile(this._mainFile);
		this.code.reset();
		this._deferredMsg = "";
		this.lastLabel = null;
		this.symbols.select();
	}

	print(msg, wantItDeferred) {
		if (wantItDeferred) {
			this._deferredMsg += msg;
			return;
		}
		if (this.pass < 2) return;

		this.wannaListing && console.log(msg);

		if (this._deferredMsg !== "") {
			this.console.log(this._deferredMsg);
			this._deferredMsg = "";
		}
	}

	warn(msg) {
		this.console.warn("WARNING", msg);
	}

	error(msg) {
		const { posInLine, line: lineIdx } = this.lexer.pos();
		const line = this.lexer.line();
		this.console.error(
			`\n${msg} in ${
				this.filepath
			} at line ${lineIdx} at ${posInLine}\n${line?.slice(
				0,
				posInLine,
			)}<>${line?.slice(posInLine + 1)}`,
		);
		// this.lexer.stopSource();
	}
}
