import { TExprStackItem, parseExpression } from "./expression.parser";
import { isMacroToken } from "../pragmas/macro.pragma";
import { VAExprError, VAParseError } from "../helpers/errors.class";
import { Context } from "../context.class";
import { TOKEN_TYPES, Token } from "../lexer/token.class";

export function parseLocalLabel(ctx: Context) {
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
export function parseLabel(ctx: Context, token: Token, isCheap = false) {
	const name = token.asString;
	let value: TExprStackItem | undefined = {
		type: TOKEN_TYPES.NUMBER,
		value: ctx.code.pc,
	};

	// console.log("PARSELABEL", ctx.lexer.token(), (ctx.opcodes[name] != undefined) || isMacroToken(ctx));

	if (isCheap) {
		ctx.lexer.next();
		if (ctx.lexer.isToken(TOKEN_TYPES.COLON)) ctx.lexer.next();

		if (ctx.pass > 1) return null;

		if (!ctx.lastLabel) throw new VAExprError("Cheap Label needs a parent label");

		if (!ctx.symbols.addLocal(ctx.lastLabel, name, value)) throw new VAExprError("Duplicate Cheap Label");

		return null;
	}

	const nextToken = ctx.lexer.lookahead();
	const type = nextToken?.type;
	switch (type) {
		// CONST = expr
		case TOKEN_TYPES.EQUAL: {
			ctx.lexer.next();
			ctx.lexer.next();
			value = parseExpression(ctx);
			if (!value) throw new VAParseError("undefined value");
			ctx.symbols.set(name, value);
			return null;
		}
		// LABEL :
		case TOKEN_TYPES.COLON:
			ctx.lexer.next();
			ctx.lexer.next();
			if (ctx.pass === 1) {
				if (ctx.symbols.exists(name)) throw new VAParseError(`Duplicate Symbol : ${name}`);
				ctx.symbols.set(name, value);
			}
			return name;

		default:
			if (ctx.opcodes[name] !== undefined || isMacroToken(ctx)) return null;

			if (ctx.pass === 1) {
				if (ctx.symbols.exists(name)) throw new VAParseError(`Duplicate Symbol : ${name}`);
				ctx.symbols.set(name, value);
			}

			ctx.lexer.next();
			return name;
	}
}
