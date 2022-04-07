import { ET_S, logError } from "./log.js";
import { processAlign } from "./pragmas/align.pragma.js";
import { c64Start } from "./pragmas/c64start.pragma.js";
import { hex, processData } from "./pragmas/data.pragma.js";
import { processDefine } from "./pragmas/define.pragma.js";
import { processExport } from "./pragmas/export.pragma.js";
import { processIf } from "./pragmas/if.pragma.js";
import { processInclude } from "./pragmas/include.pragma.js";
import { processListing } from "./pragmas/listing.pragma.js";
import { processMacro } from "./pragmas/macro.pragma.js";
import { ignorePragma, processEnd, processPage } from "./pragmas/misc.pragma.js";
import { processNamespace } from "./pragmas/namespace.pragma.js";
import { processOption } from "./pragmas/option.pragma.js";
import { processOrg } from "./pragmas/org.pragma.js";
import { processASMOuput } from "./pragmas/out.pragma.js";
import { processRepeat } from "./pragmas/repeat.pragma.js";
import { processSegment } from "./pragmas/segment.pragma.js";
import { processSetCPU } from "./pragmas/setcpu.pragma.js";
import { processText } from "./pragmas/string.pragma.js";
import { nextLine } from "./tokenizer.js";

export function parsePragma(pragma) {

	// console.log("parsePragma", pragma);

	const cmd= pragma.replace(/^\./,"");
	switch(cmd) {

		case "SRC":
		case "SOURCE":
			return "INCLUDE";

		case "PROCESSOR":
			return "SETCPU";

		case "RES":
			return "FILL";

		case "BYTE":
		case "BYT":
			return "DB";

		case "WORD":
			return "DW";

		case "LONG":
			return "DL";

		case "DBYT":
			return "DBYTE";

		case "RORG":
		case "*":
			return "ORG";

		case "STRING":
		case "STR":
			return "TEXT";

		case "ASCIIZ":
		case "CSTR":
			return "CSTRING";

		case "PSTR":
			return "PSTRING";

		case "LST":
			return "LISTING";

		default:
			return pragma[0] == "." ? cmd : null;
	}

}

function addPragmaDef(handlerFn, isBlock, pragmaNames) {
	pragmaNames.forEach(pragma => {
		pragmaDefs[pragma]= {handlerFn, isBlock};
	});
}

const pragmaDefs= {};
addPragmaDef(processIf			,  true, ["IF"]);
addPragmaDef(processMacro		,  true, ["MACRO"]);
addPragmaDef(processRepeat		,  true, ["REPEAT"]);
addPragmaDef(processDefine		,  true, ["DEFINE"]);

addPragmaDef(processEnd			, false, ["END"]);
addPragmaDef(processASMOuput	, false, ["OUT", "WARNING", "ERROR"]);
addPragmaDef(processListing		, false, ["LISTING"]);
addPragmaDef(processSetCPU		, false, ["SETCPU"]);
addPragmaDef(processOption		, false, ["OPT"]);
addPragmaDef(c64Start			, false, ["PETSTART", "C64START"]);
addPragmaDef(processOrg			, false, ["ORG"]);
addPragmaDef(processSegment		, false, ["SEGMENT"]);
addPragmaDef(processAlign		, false, ["ALIGN", "FILL"]);
addPragmaDef(ignorePragma		, false, ["DATA"]);
addPragmaDef(processPage		, false, ["PAGE", "SKIP"]);
addPragmaDef(processText		, false, ["TEXT", "ASCII", "PETSCII", "PETSCR", "C64SCR", "CSTRING", "PSTRING"]);
addPragmaDef(hex				, false, ["HEX"]);
addPragmaDef(processData		, false, ["DB", "DW", "DL", "DBYTE", "DWORD"]);

addPragmaDef(processInclude		, false, ["INCLUDE"]);
addPragmaDef(processNamespace	, false, ["NAMESPACE"]);
addPragmaDef(processExport		, false, ["EXPORT"]);

export function isPragmaBlock(pragma) {
	return pragmaDefs[pragma] ? pragmaDefs[pragma].isBlock : false;
}

export function processPragma(ctx, pragma) {

	const pragmaDef= pragmaDefs[pragma];
	if(!pragmaDef) {
		ctx.pict+= pragma;
		logError(ctx, ET_S,'invalid pragma');
		return false;
	}

	ctx.ofs++;
	const isOK= pragmaDef.handlerFn(ctx, pragma);
	if(!isOK)
		return false;

	nextLine(ctx);
	return null;
}
