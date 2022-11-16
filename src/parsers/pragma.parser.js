import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import tokens from "../parsers/pragma.tokens.js";
import { processAlign } from "../pragmas/align.pragma.js";
import { processData, processHex } from "../pragmas/data.pragma.js";
import { processDefine } from "../pragmas/define.pragma.js";
import { processEnd } from "../pragmas/end.pragma.js";
import { processExport } from "../pragmas/export.pragma.js";
import { processFill } from "../pragmas/fill.pragma.js";
import { processIf } from "../pragmas/if.pragma.js";
import { processInclude } from "../pragmas/include.pragma.js";
import { processListing } from "../pragmas/listing.pragma.js";
import { processMacro } from "../pragmas/macro.pragma.js";
import { processNamespace } from "../pragmas/namespace.pragma.js";
import { processOption } from "../pragmas/option.pragma.js";
import { processOrg } from "../pragmas/org.pragma.js";
import { processASMOuput } from "../pragmas/out.pragma.js";
import { processRepeat } from "../pragmas/repeat.pragma.js";
import { processSegment } from "../pragmas/segment.pragma.js";
import { processSetCPU } from "../pragmas/setcpu.pragma.js";
import { processText } from "../pragmas/string.pragma.js";

export function isPragmaToken(ctx) {
	return 	ctx.lexer.token().type == TOKEN_TYPES.DOT &&
			ctx.lexer.isLookahead(TOKEN_TYPES.IDENTIFIER);
}

export function isPragmaBlock(pragma) {
	return pragmaDefs[pragma] ? pragmaDefs[pragma].isBlock : false;
}

function addPragmaDef(handlerFn, isBlock, pragmaNames) {
	pragmaNames.forEach(pragma => {
		pragmaDefs[pragma]= {handlerFn, isBlock};
	});
}

const pragmaDefs= {};
addPragmaDef(processIf			,  true, [tokens.IF]);
addPragmaDef(null				,  false, [tokens.ELSE]);

addPragmaDef(processRepeat		,  true, [tokens.REPEAT]);
addPragmaDef(processDefine		,  true, [tokens.DEFINE]);
addPragmaDef(processMacro		,  true, [tokens.MACRO]);

addPragmaDef(processOption		, false, [tokens.OPT, tokens.OPTION]);
addPragmaDef(processText		, false, [
											// no length
											tokens.TEXT,
											// zero terminated
											tokens.CSTRING, tokens.CSTR, tokens.ASCIIZ,
											// 1str byte is length
											tokens.PSTRING, tokens.PSTR
										]);

addPragmaDef(processEnd			, false, [tokens.END]);
addPragmaDef(processASMOuput	, false, [
											tokens.OUT, tokens.ECHO, tokens.LOG,
											tokens.WARNING,
											tokens.ERROR
										]);
addPragmaDef(processListing		, false, [tokens.LST, tokens.LIST, tokens.LISTING]);
addPragmaDef(processSetCPU		, false, [tokens.CPU, tokens.SETCPU, tokens.PROCESSOR]);
addPragmaDef(processOrg			, false, [tokens.ORG]);
addPragmaDef(processSegment		, false, [tokens.SEGMENT]);
addPragmaDef(processAlign		, false, [tokens.ALIGN]);
addPragmaDef(processFill		, false, [tokens.FILL, tokens.RES]);
addPragmaDef(processHex			, false, [tokens.HEX]);
addPragmaDef(processData		, false, [	tokens.DB,
											tokens.DW,
											tokens.DL,
											tokens.DBYTE,
											tokens.DWORD
										]);

addPragmaDef(processInclude		, false, [tokens.INCLUDE]);
addPragmaDef(processNamespace	, false, [tokens.NAMESPACE]);
addPragmaDef(processExport		, false, [tokens.EXPORT]);

export function parsePragma(ctx) {

	ctx.lexer.next();

	const token= ctx.lexer.token();
	if(!token)
		return false;

	const pragmaDef= pragmaDefs[token.value];
	if(!pragmaDef)
		throw new VAParseError("PRAGMA: Unknown pragma");
	if(!pragmaDef.handlerFn)
		throw new VAParseError("PRAGMA: Syntax Error");

	ctx.lexer.next();

	const isOK= pragmaDef.handlerFn(ctx, token.value);
	if(!isOK)
		return false;

	return true;
}
