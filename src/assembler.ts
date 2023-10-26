import { Context } from "./context.class";
import { VAParseError } from "./helpers/errors.class";
import { TOKEN_TYPES, Token } from "./lexer/token.class";
import { parseLabel, parseLocalLabel } from "./parsers/label.parser";
import { parseOpcode } from "./parsers/opcode.parser";
import { parseOrg } from "./parsers/org.parser";
import { parsePragma } from "./parsers/pragma.parser";
import { isPragmaToken } from "./parsers/pragma.tokens";
import { expandMacro, isMacroToken } from "./pragmas/macro.pragma";
import { setcpu } from "./pragmas/setcpu.pragma";
import { Options } from "./types/Options.type";
import { TAssemblerResult } from "./types/assembler.type";

const log = console.log;

const ASM_BYTES_LEN = 32;

export function assemble(src: string | { content: string }, opts: Options): TAssemblerResult {
	const ctx = new Context(opts, src);
	setcpu(ctx, opts.cpu);

	if (ctx.symbols.dump().trim() !== "") throw `ARGL ! -> "${ctx.symbols.dump()}"`;

	const tryAsm = () => {
		try {
			asm(ctx);
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
		error,
	};
}

function asm(ctx: Context) {
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
				case TOKEN_TYPES.AT: {
					ctx.lexer.next();
					const token = ctx.lexer.token();
					if (!token || token.type !== TOKEN_TYPES.IDENTIFIER) return null;
					return parseLabel(ctx, token, true);
				}
			}
			return null;
		};

		while (true) {
			// console.log("LINE", ctx.lexer.line());

			//
			// ORG as * = xxxx
			//
			if (ctx.lexer.isToken(TOKEN_TYPES.STAR)) {
				parseOrg(ctx);
				break;
			}

			//
			// LABEL
			//
			label = lblParser(token);
			if (label) ctx.lastLabel = label;

			//
			// PRAGMA
			//
			if (isPragmaToken(ctx)) {
				parsePragma(ctx);

				// console.log("AFTER PRAGMA", ctx.lexer.token(), ctx.lexer.pos());
				break;
			}

			//
			// MACRO
			//
			if (isMacroToken(ctx)) {
				expandMacro(ctx);
				break;
			}

			// console.log("MAIN", ctx.lexer.token());

			//
			// OPCODE
			//
			if (ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER)) parseOpcode(ctx);

			break;
		}

		// log("LOOP", ctx.lexer.token(), ctx.pass);

		const tok = ctx.lexer.token();
		if (tok) throw new VAParseError(`Syntax Error on ${tok.text}`);

		if (ctx.pass === 2) {
			if (label) ctx.print(`${label}:`);

			let listingLine = "";

			const asmOut = ctx.code.output;
			const wantAfter = asmOut?.length ?? 0 > ASM_BYTES_LEN;

			if (asmOut && !wantAfter) listingLine += asmOut;

			listingLine = listingLine.padEnd(18);

			listingLine += currLine;

			if (asmOut && wantAfter) listingLine += `\n${asmOut}`;

			ctx.print(listingLine);
		}
	}

	ctx.wannaStop = false;
}
