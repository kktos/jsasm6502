import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TMacro } from "../helpers/macroManager";
import { EVENT_TYPES } from "../lexer/lexer.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { readBlock } from "../parsers/block.parser";
import { TExprStackItem, parseExpression } from "../parsers/expression.parser";

// const macros = {};

const log = console.log;

export function processMacro(ctx: Context) {
	const macro: TMacro = { parms: [], block: "", hasRestParm: false };

	const tok = ctx.lexer.token();
	if (!tok || tok.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError("MACRO: Need a name");

	const macroName = tok.asString.toUpperCase();

	ctx.lexer.next();

	let isLastParam = false;
	while (ctx.lexer.match([TOKEN_TYPES.IDENTIFIER, TOKEN_TYPES.REST])) {
		if (ctx.lexer.isToken(TOKEN_TYPES.REST)) {
			isLastParam = true;
			ctx.lexer.next();
			macro.hasRestParm = true;
		}

		const tok = ctx.lexer.token();
		if (!tok || tok.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError("MACRO: Need a param name");

		macro.parms.push(tok.asString);

		ctx.lexer.next();

		if (!ctx.lexer.token()) break;

		if (!ctx.lexer.isToken(TOKEN_TYPES.COMMA))
			throw new VAParseError("MACRO: Syntax Error; Needs a comma between parameter");

		ctx.lexer.next();
		// if(!ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
		// 	throw new VAParseError("MACRO: Missing a parameter name");
	}

	const [block] = readBlock(ctx);
	if (!block) throw new VAParseError("MACRO: empty block");

	macro.block = block;

	if (ctx.pass === 1) {
		ctx.macros.add(macroName, macro);
	}

	return true;
}

export function isMacroToken(ctx: Context) {
	const currTok = ctx.lexer.token();

	return currTok?.type === TOKEN_TYPES.IDENTIFIER && ctx.macros.get(currTok.asString) !== undefined;
}

export function expandMacro(ctx: Context) {
	const tok = ctx.lexer.token();
	if (!tok) throw new VAParseError("MACRO: Missing name");

	const macro = ctx.macros.get(tok.asString);
	if (!macro) throw new VAParseError(`MACRO: Unknown macro ${tok.asString}`);

	const paramsCount = macro.parms.length;

	// log("expandMacro line", ctx.lexer.line());

	ctx.lexer.next();

	const parms = macro.hasRestParm ? macro.parms.slice(0, -1) : macro.parms;
	for (let idx = 0; idx < parms.length; idx++) {
		let parm: TExprStackItem | undefined = undefined;

		if (ctx.lexer.token()) {
			if (idx > 0) {
				if (!ctx.lexer.isToken(TOKEN_TYPES.COMMA)) throw new VAParseError("MACRO: Syntax Error; Missing comma");
				ctx.lexer.next();
			}

			// log("expandMacro line", ctx.lexer.line());

			parm = parseExpression(ctx, new Set([TOKEN_TYPES.COMMA]));
		}

		if (!parm) throw new VAParseError(`MACRO: missing parameter value for ${parms[idx]}`);

		// log("expandMacro", parms[idx], parm);

		// we're using a label as parm but it's not yet defined (will be on pass 2)
		if (ctx.pass === 1 && parm.type === undefined) {
			parm.type = TOKEN_TYPES.NUMBER;
		}

		// if(ctx.pass == 2)
		ctx.symbols.override(parms[idx], parm);
	}

	if (macro.hasRestParm) {
		if (macro.parms.length > 1) {
			if (!ctx.lexer.isToken(TOKEN_TYPES.COMMA)) throw new VAParseError("MACRO: Syntax Error; Missing comma");
			ctx.lexer.next();
		}
		const restParm = macro.parms[macro.parms.length - 1];
		const restArray = [];
		do {
			const parm = parseExpression(ctx, new Set([TOKEN_TYPES.COMMA]));

			if (ctx.lexer.token() && !ctx.lexer.isToken(TOKEN_TYPES.COMMA))
				throw new VAParseError("MACRO: Syntax Error; Missing comma");

			ctx.lexer.next();

			restArray.push(parm);
		} while (ctx.lexer.token());

		ctx.symbols.override(restParm, {
			type: TOKEN_TYPES.ARRAY,
			value: restArray,
		});
	}

	const onEndOfBlock = () => {
		for (const name of macro.parms) {
			ctx.symbols.restore(name);
		}
	};

	// if(ctx.pass==2) {
	ctx.lexer.pushSource(macro.block);
	if (paramsCount) ctx.lexer.addEventListener(EVENT_TYPES.EOS, onEndOfBlock);
	// }
}
