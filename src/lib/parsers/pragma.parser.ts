import { VAParseError } from "../helpers/errors.class";
import { TPragmaHandlerFn, pragmaDefs, tokens } from "./pragma.tokens";
import { processAlign } from "../pragmas/align.pragma";
import { processData, processHex } from "../pragmas/data.pragma";
import { processDefine } from "../pragmas/define.pragma";
import { processEnd } from "../pragmas/end.pragma";
import { processExport } from "../pragmas/export.pragma";
import { processFill } from "../pragmas/fill.pragma";
import { processIf } from "../pragmas/if.pragma";
import { processInclude } from "../pragmas/include.pragma";
import { processListing } from "../pragmas/listing.pragma";
import { processMacro } from "../pragmas/macro.pragma";
import { processNamespace } from "../pragmas/namespace.pragma";
import { processOption } from "../pragmas/option.pragma";
import { processOrg } from "../pragmas/org.pragma";
import { processASMOuput } from "../pragmas/out.pragma";
import { processRepeat } from "../pragmas/repeat.pragma";
import { processSegment } from "../pragmas/segment.pragma";
import { processSetCPU } from "../pragmas/setcpu.pragma";
import { processText } from "../pragmas/string.pragma";
import { Context } from "../context.class";
import { processFor } from "../pragmas/for.pragma";
import { processFunction } from "../pragmas/function.pragma";
import { processLet } from "../pragmas/let.pragma";

function addPragmaDef(handlerFn: TPragmaHandlerFn | null, isBlock: boolean, pragmaNames: string[]) {
	if (typeof handlerFn === "undefined")
		throw new VAParseError(`PRAGMA: no handler defined for ${pragmaNames.join(",")}`);

	for (const pragma of pragmaNames) {
		if (Object.hasOwn(pragmaDefs, pragma)) throw new VAParseError(`PRAGMA: "${pragma}" already defined`);

		pragmaDefs[pragma] = { handlerFn, isBlock };
	}
}

addPragmaDef(processIf, true, [tokens.IF]);
addPragmaDef(null, true, [tokens.ELSE]);

addPragmaDef(processRepeat, true, [tokens.REPEAT]);
addPragmaDef(processFor, true, [tokens.FOR]);
addPragmaDef(processDefine, true, [tokens.DEFINE]);
addPragmaDef(processMacro, true, [tokens.MACRO]);

addPragmaDef(processOption, false, [tokens.OPT, tokens.OPTION]);
addPragmaDef(processText, false, [
	// no length
	tokens.TEXT,
	// zero terminated
	tokens.CSTRING,
	tokens.CSTR,
	tokens.ASCIIZ,
	// 1str byte is length
	tokens.PSTRING,
	tokens.PSTR,
	// 1str word is length
	tokens.PSTRINGL,
	tokens.PSTRL,
]);

addPragmaDef(processEnd, false, [tokens.END]);
addPragmaDef(processASMOuput, false, [tokens.OUT, tokens.ECHO, tokens.LOG, tokens.WARNING, tokens.ERROR]);
addPragmaDef(processListing, false, [tokens.LST, tokens.LIST, tokens.LISTING]);
addPragmaDef(processSetCPU, false, [tokens.CPU, tokens.SETCPU, tokens.PROCESSOR]);
addPragmaDef(processOrg, false, [tokens.ORG]);
addPragmaDef(processSegment, false, [tokens.SEGMENT]);
addPragmaDef(processAlign, false, [tokens.ALIGN]);
addPragmaDef(processFill, false, [tokens.FILL, tokens.RES, tokens.DS]);
addPragmaDef(processHex, false, [tokens.HEX]);
addPragmaDef(processData, false, [
	tokens.DB,
	tokens.BYTE,
	tokens.DW,
	tokens.WORD,
	tokens.DL,
	tokens.LONG,
	tokens.DBYTE,
	tokens.DWORD,
]);

addPragmaDef(processInclude, false, [tokens.INCLUDE]);
addPragmaDef(processNamespace, false, [tokens.NAMESPACE]);
addPragmaDef(processFunction, false, [tokens.FUNCTION]);
addPragmaDef(processExport, false, [tokens.EXPORT]);
addPragmaDef(processLet, false, [tokens.LET]);

export function parsePragma(ctx: Context) {
	ctx.lexer.next();

	const token = ctx.lexer.token();
	if (!token) return false;

	const pragmaDef = pragmaDefs[token.asString];
	if (!pragmaDef) throw new VAParseError(`PRAGMA: Unknown pragma "${token.asString}"`);
	if (!pragmaDef.handlerFn) throw new VAParseError(`PRAGMA: No handler for pragma "${token.asString}"`);

	ctx.lexer.next();

	return pragmaDef.handlerFn(ctx, token.asString);
}
