import { Context } from "./context.class";
import { VAParseError } from "./helpers/errors.class";
import { getHexWord } from "./helpers/utils";
import { TOKEN_TYPES, type Token } from "./lexer/token.class";
import { parseLabel, parseLocalLabel } from "./parsers/label.parser";
import { isOpcode, parseOpcode } from "./parsers/opcode.parser";
import { parseOrg } from "./parsers/org.parser";
import { parsePragma } from "./parsers/pragma.parser";
import { isPragma } from "./parsers/pragma.tokens";
import { expandMacro, isMacro } from "./pragmas/macro.pragma";
import { setcpu } from "./pragmas/setcpu.pragma";
import type { Options } from "./types/Options.type";
import type { TAssemblerDisasm, TAssemblerResult } from "./types/assembler.type";

const log = console.log;

const ASM_BYTES_LEN = 34;

export function assemble(src: string | { name: string; content: string }, opts: Options): TAssemblerResult {
	const ctx = Context.createContext(opts, src);
	setcpu(ctx, opts.cpu);

	// if (ctx.symbols.dump().trim() !== "") throw `ARGL ! -> "${ctx.symbols.dump()}"`;

	const tryAsm = (): [TAssemblerDisasm | null, string | null] => {
		try {
			return [asm(ctx), null];
		} catch (err) {
			// handle internal errors
			if ((err as Error)?.name?.match(/^VA/)) {
				const errMsg = (err as Error).message;
				ctx.error(errMsg);
				return [null, errMsg];
			}
			throw err;
		}
	};

	// log("========================== PASS 1 ==========================");

	// first pass
	let [disasm, error] = tryAsm();

	if (!error) {
		// log("========================== PASS 2 ==========================");
		ctx.reset();
		ctx.pass = 2;
		// second pass
		[disasm, error] = tryAsm();
	}

	return {
		symbols: ctx.symbols,
		segments: ctx.code.segments,
		obj: ctx.code.obj,
		dump: ctx.code.dump,
		disasm: disasm ?? [],
		error,
	};
}

function asm(ctx: Context): TAssemblerDisasm {
	const disasm: TAssemblerDisasm = [{ name: null, content: "" }];
	let lastVarname = "";

	// log(">> ASM", ctx.pass, ctx.lexer.pos());

	while (!ctx.wannaStop && ctx.lexer.nextLine()) {
		const token = ctx.lexer.token();

		if (!token) continue;

		// log(`---- LINE [${ctx.lexer.id}] <${ctx.lexer.line().trim()}>`, token);
		// log(dbgStringList(ctx.lexer.lines()));

		if (token.type === TOKEN_TYPES.INVALID) throw new VAParseError(`Invalid character ${token.value}`);

		const currLine = ctx.lexer.line();

		// log(ctx.pass, ctx.lexer.pos().line,  currLine);

		let label = null;

		const lblParser = (token: Token) => {
			// log("lblParser", token, ctx.lexer.line());

			switch (token.type) {
				// LOCAL LABEL <!> <:>
				case TOKEN_TYPES.BANG:
				case TOKEN_TYPES.COLON:
					return parseLocalLabel(ctx);

				// LABEL <id>
				case TOKEN_TYPES.IDENTIFIER:
					return parseLabel(ctx, token);

				// CHEAP LABEL <@> <id>
				// case TOKEN_TYPES.AT: {
				// 	ctx.lexer.next();
				// 	const token = ctx.lexer.token();
				// 	if (!token || token.type !== TOKEN_TYPES.IDENTIFIER) return null;
				// 	return parseLabel(ctx, token, true);
				// }
			}
			return null;
		};

		while (true) {
			// log("LINE", ctx.lexer.token(), ctx.lexer.line());

			//
			// ORG as * = xxxx
			//
			if (ctx.lexer.isToken(TOKEN_TYPES.STAR)) {
				parseOrg(ctx);
				break;
			}

			if (isOpcode(ctx)) {
				parseOpcode(ctx);
				break;
			}

			//
			// LABEL
			//

			// log("PARSE LABEL", token, ctx.lexer.token());

			label = lblParser(token);
			if (label) ctx.lastLabel = label;

			//
			// PRAGMA
			//

			// log("PARSE PRAGMA", ctx.lexer.token());

			if (isPragma(ctx)) {
				parsePragma(ctx);

				// log("AFTER PRAGMA", ctx.lexer.token(), ctx.lexer.pos());
				break;
			}

			//
			// MACRO
			//

			// log("PARSE MACRO", ctx.lexer.token());

			if (isMacro(ctx)) {
				expandMacro(ctx);
				break;
			}

			// console.log("MAIN", ctx.lexer.token());

			//
			// OPCODE
			//

			// log("PARSE OPCODE", ctx.lexer.token());

			if (ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER)) parseOpcode(ctx);

			break;
		}

		// log(`MAINLOOP(${ctx.pass})`, ctx.needNewline ? "needNewline" : "noNewline", ctx.lexer.token());

		if (ctx.needNewline) {
			const tok = ctx.lexer.token();
			if (tok) {
				throw new VAParseError(`Syntax Error on line ${ctx.lexer.pos().line} at "${tok.text}"`);
			}
		}
		ctx.needNewline = true;

		if (ctx.pass === 1) continue;
		if (!ctx.wantListing) continue;

		let currentDisasmFile = disasm.filter((item) => item.name === ctx.listingFile)[0];
		if (!currentDisasmFile) {
			currentDisasmFile = { name: ctx.listingFile, content: "" };
			disasm.push(currentDisasmFile);
		}

		const asmOut = ctx.code.output;
		if (asmOut) {
			const parts: string[] = [];
			for (let idx = 0; idx < asmOut.length; idx++) {
				parts.push(asmOut[idx]);
				if (idx === 0) {
					const padding = ASM_BYTES_LEN - asmOut[idx].length;
					parts.push("".padEnd(padding));
					parts.push(currLine);
				}
				parts.push("\n");
			}
			currentDisasmFile.content += parts.join("");
			continue;
		}

		const entry = ctx.lastLabel?.value;
		if (entry?.extra?.isVariable === true && lastVarname !== ctx.lastLabel?.name) {
			lastVarname = ctx.lastLabel?.name ?? "";
			const parts: string[] = [];
			switch (typeof entry.value) {
				case "number":
					parts.push(getHexWord(entry.value));
					break;
				case "string":
				case "object":
					parts.push(JSON.stringify(entry.value));
					break;
				default:
					parts.push(String(entry.value));
			}
			currentDisasmFile.content += parts.join("");
		}
		currentDisasmFile.content += `${"".padEnd(ASM_BYTES_LEN)}${currLine}\n`;
	}

	ctx.wannaStop = false;
	return disasm;
}
