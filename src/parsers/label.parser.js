import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { parseExpression } from "../parsers/expression.parser.js";
import { isMacroToken } from "../pragmas/macro.pragma.js";

export function parseLocalLabel(ctx) {
	ctx.lexer.next();

	// console.log("parseLocalLabel", ctx.pass, ctx.code.pc);

	// if(ctx.pass > 1)
	// 	return;

	ctx.symbols.addMarker(ctx.code.pc);

	return null;
}

/*
LABEL
CONST = expr
 */
export function parseLabel(ctx, isCheap = false) {
	const name = ctx.lexer.token().value;
	let value = { type: TOKEN_TYPES.NUMBER, value: ctx.code.pc };

	// console.log("PARSELABEL", ctx.lexer.token(), (ctx.opcodes[name] != undefined) || isMacroToken(ctx));

	if (isCheap) {
		ctx.lexer.next();
		if (ctx.lexer.isToken(TOKEN_TYPES.COLON)) ctx.lexer.next();

		if (ctx.pass > 1) return null;

		if (!ctx.symbols.addCheap(ctx.lastLabel, name, value))
			throw new VAExprError("Duplicate Cheap Label");

		return null;
	}

	const type = ctx.lexer.lookahead() ? ctx.lexer.lookahead().type : undefined;
	switch (type) {
		// CONST = expr
		case TOKEN_TYPES.EQUAL: {
			ctx.lexer.next();
			ctx.lexer.next();
			value = parseExpression(ctx);
			ctx.symbols.set(name, value);
			return null;
		}
		// LABEL :
		case TOKEN_TYPES.COLON:
			ctx.lexer.next();
			ctx.lexer.next();
			if (ctx.pass === 1) ctx.symbols.set(name, value);
			return name;

		default:
			if (ctx.opcodes[name] !== undefined || isMacroToken(ctx)) return null;

			if (ctx.pass === 1) ctx.symbols.set(name, value);

			ctx.lexer.next();
			return name;
	}
}
