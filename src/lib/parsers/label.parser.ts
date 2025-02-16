import { parseExpression } from "./expression/expression.parser";
import { isMacroToken } from "../pragmas/macro.pragma";
import { VAExprError, VAParseError } from "../helpers/errors.class";
import type { Context } from "../context.class";
import { TOKEN_TYPES, type Token } from "../lexer/token.class";
import { TExprStackItem } from "./expression/TExprStackItem.class";

const log = console.log;

export function parseLocalLabel(ctx: Context) {
	ctx.lexer.next();

	// console.log("parseLocalLabel", ctx.pass, ctx.code.pc);

	// if(ctx.pass > 1)
	// 	return;

	ctx.symbols.marker.add(ctx.code.pc);

	return null;
}

export function addLabel(ctx: Context, name: string, value: TExprStackItem) {
	const { line } = ctx.lexer.pos();
	value.extra = { ...value.extra, file: ctx.filepath, line: line, isVariable: true };
	ctx.symbols.set(name, value);
}

function defineLabel(ctx: Context, name: string, value: TExprStackItem) {
	if (ctx.symbols.exists(name, ctx.symbols.namespace, ctx.symbols.fn.current ?? undefined)) {
		const label = ctx.symbols.get(name);
		if (label?.extra?.exported === 1) {
			label.extra.exported++;
		} else {
			const msg1 = `Duplicate Label : "${ctx.symbols.namespace}.${name}"`;
			const msg2 = `${ctx.symbols.export.isExported(name) ? "Exported from" : "Defined in"} "${label?.extra?.file}":${
				label?.extra?.line
			}`;
			throw new VAParseError(`${msg1}\n${msg2}\n`);
		}
	}
	addLabel(ctx, name, value);
	value.extra = { ...value.extra, isVariable: false };
}

/*
LABEL
CONST = expr
 */
export function parseLabel(ctx: Context, token: Token) {
	const name = token.asString;
	let value = TExprStackItem.newNumber(ctx.code.pc);

	// console.log("PARSELABEL", ctx.lexer.token(), (ctx.opcodes[name] != undefined) || isMacroToken(ctx));

	// if (isLocal) {
	// 	ctx.lexer.next();
	// 	if (ctx.lexer.isToken(TOKEN_TYPES.COLON)) ctx.lexer.next();

	// 	if (ctx.pass > 1) return null;

	// 	if (!ctx.lastLabel) throw new VAExprError("Local Label needs a parent label");

	// 	if (!ctx.symbols.local.add(ctx.lastLabel.name, name, value)) throw new VAExprError("Duplicate Local Label");

	// 	return null;
	// }

	const nextToken = ctx.lexer.lookahead();
	const type = nextToken?.type;
	switch (type) {
		// CONST = expr
		case TOKEN_TYPES.EQUAL: {
			ctx.lexer.next();
			ctx.lexer.next();
			const res = parseExpression(ctx);
			if (!res) throw new VAParseError("LABEL: undefined value");
			value = res;

			// log("LABEL SET", ctx.pass, name, value);

			addLabel(ctx, name, value);

			// log("LABEL GET", ctx.pass, ctx.symbols.get(name));

			break;
		}
		// LABEL :
		case TOKEN_TYPES.COLON:
			ctx.lexer.next();
			ctx.lexer.next();
			if (ctx.pass === 1) {
				defineLabel(ctx, name, value);
			}
			break;

		default:
			if (ctx.opcodes[name] !== undefined || isMacroToken(ctx)) return null;

			// log("LABEL", name, ctx.pass);

			if (ctx.pass === 1) {
				defineLabel(ctx, name, value);
			}

			ctx.lexer.next();
	}
	return { name, value };
}
