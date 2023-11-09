import { Context } from "./context.class";
import { VAParseError } from "./helpers/errors.class";
import { getHexWord } from "./helpers/utils";
import { TOKEN_TYPES, Token } from "./lexer/token.class";
import { parseLabel, parseLocalLabel } from "./parsers/label.parser";
import { isIdentifierAnOpcode, parseOpcode } from "./parsers/opcode.parser";
import { parseOrg } from "./parsers/org.parser";
import { parsePragma } from "./parsers/pragma.parser";
import { isPragmaToken } from "./parsers/pragma.tokens";
import { expandMacro, isMacroToken } from "./pragmas/macro.pragma";
import { setcpu } from "./pragmas/setcpu.pragma";
import { Options } from "./types/Options.type";
import { TAssemblerResult } from "./types/assembler.type";

const log = console.log;

const ASM_BYTES_LEN = 34;

export function assemble(src: string | { name: string; content: string }, opts: Options): TAssemblerResult {
	const ctx = Context.createContext(opts, src);
	setcpu(ctx, opts.cpu);

	// if (ctx.symbols.dump().trim() !== "") throw `ARGL ! -> "${ctx.symbols.dump()}"`;

	let disasm = "";

	const tryAsm = () => {
		try {
			disasm += asm(ctx);
		} catch (err) {
			// handle internal errors
			if ((err as Error)?.name?.match(/^VA/)) {
				const errMsg = (err as Error).message;
				ctx.error(errMsg);
				return errMsg;
			}
			throw err;
		}
		return null;
	};

	// first pass
	let error = tryAsm();

	if (!error) {
		ctx.reset();
		ctx.pass = 2;
		// second pass
		error = tryAsm();
	}

	return {
		symbols: ctx.symbols,
		segments: ctx.code.segments,
		obj: ctx.code.obj,
		dump: ctx.code.dump,
		disasm,
		error,
	};
}

function asm(ctx: Context): string {
	let disasm = "";
	let lastVarname = "";

	// log("ASM", ctx.pass, ctx.lexer.pos());

	while (!ctx.wannaStop && ctx.lexer.nextLine()) {
		const token = ctx.lexer.token();

		if (!token) continue;

		// console.log("---- LINE 0", ctx.lexer.line(), token);

		if (token.type === TOKEN_TYPES.INVALID) throw new VAParseError(`Invalid character ${token.value}`);

		const currLine = ctx.lexer.line();

		// log(ctx.pass, ctx.lexer.pos().line,  currLine);

		let label = null;

		const lblParser = (token: Token) => {
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

			if (isIdentifierAnOpcode(ctx)) {
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

			if (isPragmaToken(ctx)) {
				parsePragma(ctx);

				// console.log("AFTER PRAGMA", ctx.lexer.token(), ctx.lexer.pos());
				break;
			}

			//
			// MACRO
			//

			// log("PARSE MACRO", ctx.lexer.token());

			if (isMacroToken(ctx)) {
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

		// log("LOOP", ctx.lexer.token(), ctx.pass);

		const tok = ctx.lexer.token();
		if (tok) throw new VAParseError(`Syntax Error on line ${ctx.lexer.pos().line} at "${tok.text}"`);

		if (ctx.pass === 2) {
			const asmOut = ctx.code.output;
			if (!asmOut) {
				const entry = ctx.lastLabel?.value;
				if (entry?.extra?.isVariable === true && lastVarname !== ctx.lastLabel?.name) {
					lastVarname = ctx.lastLabel?.name ?? "";
					switch (typeof entry.value) {
						case "number":
							disasm += getHexWord(entry.value);
							break;
						case "string":
						case "object":
							disasm += `${JSON.stringify(entry.value)}`;
							break;
						default:
							disasm += entry.value;
					}
				}
				disasm += `${"".padEnd(ASM_BYTES_LEN)}${currLine}\n`;
			} else {
				for (let idx = 0; idx < asmOut.length; idx++) {
					disasm += asmOut[idx];
					if (idx === 0) {
						const padding = ASM_BYTES_LEN - asmOut[idx].length;
						disasm += `${"".padEnd(padding)}${currLine}`;
					}
					disasm += "\n";
				}
			}
		}
	}

	ctx.wannaStop = false;
	return disasm;
}
