import { Context } from "../context.class";
import { TOKEN_TYPES } from "../lexer/token.class";

export type TPragmaHandlerFn = (ctx: Context, pragma: string) => boolean;
type TPragmaDef = {
	handlerFn: TPragmaHandlerFn | null;
	isBlock: boolean;
};
type TPragmaDefs = Record<string, TPragmaDef>;

export const tokens = {
	IF: "IF",
	ELSE: "ELSE",
	REPEAT: "REPEAT",
	FOR: "FOR",
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
	FUNCTION: "FUNCTION",
	NAMESPACE: "NAMESPACE",
	EXPORT: "EXPORT",
	LET: "LET",
};

export const pragmaDefs: TPragmaDefs = {};

export function isPragmaToken(ctx: Context) {
	return ctx.lexer.isToken(TOKEN_TYPES.DOT) && ctx.lexer.isLookahead(TOKEN_TYPES.IDENTIFIER);
}

export function isBlockPragma(ctx: Context) {
	const isDot = ctx.lexer.isToken(TOKEN_TYPES.DOT);
	const lookahead = ctx.lexer.lookahead();
	const isPragma = isDot && lookahead?.type === TOKEN_TYPES.IDENTIFIER;

	return isPragma && (pragmaDefs[lookahead.asString] ? pragmaDefs[lookahead.asString].isBlock : false);
}
