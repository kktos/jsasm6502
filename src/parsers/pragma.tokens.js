import { TOKEN_TYPES } from "../lexer/lexer.class.js";

export const tokens = {
	IF: "IF",
	ELSE: "ELSE",
	REPEAT: "REPEAT",
	DEFINE: "DEFINE",
	MACRO: "MACRO",
	OPT: "OPT",
	OPTION: "OPTION",
	TEXT: "TEXT",
	CSTR: "CSTR",
	CSTRING: "CSTRING",
	ASCIIZ: "ASCIIZ",
	PSTR: "PSTR",
	PSTRING: "PSTRING",
	PSTRL: "PSTRL",
	PSTRINGL: "PSTRINGL",
	END: "END",
	OUT: "OUT",
	ECHO: "ECHO",
	LOG: "LOG",
	WARNING: "WARNING",
	ERROR: "ERROR",
	LST: "LST",
	LIST: "LIST",
	LISTING: "LISTING",
	CPU: "CPU",
	SETCPU: "SETCPU",
	PROCESSOR: "PROCESSOR",
	ORG: "ORG",
	SEGMENT: "SEGMENT",
	ALIGN: "ALIGN",
	FILL: "FILL",
	DS: "DS",
	RES: "RES",
	HEX: "HEX",
	DB: "DB",
	BYTE: "BYTE",
	DW: "DW",
	WORD: "WORD",
	DL: "DL",
	LONG: "LONG",
	DBYTE: "DBYTE",
	DWORD: "DWORD",
	INCLUDE: "INCLUDE",
	NAMESPACE: "NAMESPACE",
	EXPORT: "EXPORT",
};

export const pragmaDefs = {};

export function isPragmaToken(ctx) {
	return (
		ctx.lexer.token().type === TOKEN_TYPES.DOT &&
		ctx.lexer.isLookahead(TOKEN_TYPES.IDENTIFIER)
	);
}

export function isPragmaBlock(pragma) {
	return pragmaDefs[pragma] ? pragmaDefs[pragma].isBlock : false;
}
