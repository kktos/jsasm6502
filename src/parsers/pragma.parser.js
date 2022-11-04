import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
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

/*
import { c64Start } from "../pragmas/c64start.pragma.js";
import { ignorePragma, processEnd, processPage } from "../pragmas/misc.pragma.js";
*/
// export function parsePragma(pragma) {

// 	if(typeof pragma != "symbol")
// 		return null;

// 	const cmd= pragma.description;
// 	switch(cmd.replace(/^\./,"")) {

// 		case "SRC":
// 		case "SOURCE":
// 			return "INCLUDE";

// 		case "PROCESSOR":
// 			return "SETCPU";

// 		case "RES":
// 			return "FILL";

// 		case "BYTE":
// 		case "BYT":
// 			return "DB";

// 		case "WORD":
// 			return "DW";

// 		case "LONG":
// 			return "DL";

// 		case "DBYT":
// 			return "DBYTE";

// 		case "RORG":
// 		case "*":
// 			return "ORG";

// 		case "STRING":
// 		case "STR":
// 			return "TEXT";

// 		case "ASCIIZ":
// 		case "CSTR":
// 			return "CSTRING";

// 		case "PSTR":
// 			return "PSTRING";

// 		case "LST":
// 			return "LISTING";

// 		default:
// 			return cmd[0] == "." ? cmd : null;
// 	}

// }

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
addPragmaDef(processIf			,  true, ["IF"]);
addPragmaDef(null				,  false, ["ELSE"]);

addPragmaDef(processRepeat		,  true, ["REPEAT"]);
addPragmaDef(processDefine		,  true, ["DEFINE"]);
addPragmaDef(processMacro		,  true, ["MACRO"]);

addPragmaDef(processOption		, false, ["OPT", "OPTION"]);
addPragmaDef(processText		, false, [
											// no length
											"TEXT",
											// zero terminated
											"CSTRING", "CSTR", "ASCIIZ",
											// 1str byte is length
											"PSTRING", "PSTR"
										]);

addPragmaDef(processEnd			, false, ["END"]);
addPragmaDef(processASMOuput	, false, [
											"OUT", "ECHO", "LOG",
											"WARNING",
											"ERROR"
										]);
addPragmaDef(processListing		, false, ["LST", "LIST", "LISTING"]);
addPragmaDef(processSetCPU		, false, ["CPU", "SETCPU", "PROCESSOR"]);
addPragmaDef(processOrg			, false, ["ORG"]);
addPragmaDef(processSegment		, false, ["SEGMENT"]);
addPragmaDef(processAlign		, false, ["ALIGN"]);
addPragmaDef(processFill		, false, ["FILL", "RES"]);
addPragmaDef(processHex			, false, ["HEX"]);
addPragmaDef(processData		, false, ["DB", "DW", "DL", "DBYTE", "DWORD"]);

addPragmaDef(processInclude		, false, ["INCLUDE"]);
addPragmaDef(processNamespace	, false, ["NAMESPACE"]);
addPragmaDef(processExport		, false, ["EXPORT"]);

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
