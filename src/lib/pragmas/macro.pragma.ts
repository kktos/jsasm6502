import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import type { TMacro, TMacroParam } from "../helpers/macroManager";
import { EVENT_TYPES } from "../lexer/lexer.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { readBlock, type TReadBlockOptions } from "../parsers/block.parser";
import { parseExpression } from "../parsers/expression/expression.parser";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

const log = console.log;

function processMacroParams(ctx: Context, macro: TMacro, opts: TReadBlockOptions) {
	const hasParenthesis = ctx.lexer.isToken(TOKEN_TYPES.LEFT_PARENT);
	if (hasParenthesis) ctx.lexer.next();

	let paramSep = null;

	while (ctx.lexer.match([TOKEN_TYPES.IDENTIFIER, TOKEN_TYPES.REST, TOKEN_TYPES.PERCENT])) {
		let isInterpolated = false;

		if (ctx.lexer.isToken(TOKEN_TYPES.PERCENT)) {
			ctx.lexer.next();
			isInterpolated = true;
		}

		if (ctx.lexer.isToken(TOKEN_TYPES.REST)) {
			ctx.lexer.next();
			macro.hasRestParm = true;
		}

		const paramName = ctx.lexer.identifier();
		if (!paramName) throw new VAParseError("MACRO: Need a param name");

		macro.parms.push({ name: paramName, isInterpolated });

		ctx.lexer.next();

		if (ctx.lexer.eol()) break;

		if (paramSep && paramSep !== ctx.lexer.tokenType()) break;
		if (!ctx.lexer.match([TOKEN_TYPES.COMMA, TOKEN_TYPES.COLON])) break;
		if (!paramSep) {
			paramSep = ctx.lexer.tokenType();
		}

		ctx.lexer.next();
	}

	if (hasParenthesis) {
		if (!ctx.lexer.isToken(TOKEN_TYPES.RIGHT_PARENT)) {
			throw new VAParseError("MACRO: Syntax Error; Missing closing parenthesis");
		}
		ctx.lexer.next();
	}

	if (ctx.lexer.isToken(TOKEN_TYPES.LEFT_CURLY_BRACE)) {
		opts.isClikeBlock = true;
	} else if (!ctx.lexer.eol()) throw new VAParseError("MACRO: Syntax Error; Needs a comma between parameter");

	if (paramSep === TOKEN_TYPES.COLON) {
		macro.wantAlternateSep = true;
	}
}

export function processMacro(ctx: Context) {
	const macro: TMacro = { parms: [], block: "", hasRestParm: false, wantAlternateSep: false };
	const opts: TReadBlockOptions = { isClikeBlock: false, wantRaw: true };

	const macroName = ctx.lexer.identifier();
	if (!macroName) throw new VAParseError("MACRO: Need a name");

	ctx.lexer.next();

	if (ctx.lexer.isToken(TOKEN_TYPES.LEFT_CURLY_BRACE)) {
		opts.isClikeBlock = true;
	} else if (!ctx.lexer.eol()) {
		processMacroParams(ctx, macro, opts);
	}

	const [block] = readBlock(ctx, opts);
	if (!block) throw new VAParseError("MACRO: empty block");

	macro.block = block;

	if (ctx.pass === 1) {
		ctx.macros.add(macroName.toUpperCase(), macro);
	}

	return true;
}

export function isMacro(ctx: Context) {
	const macroName = ctx.lexer.identifier();
	return macroName ? ctx.macros.exists(macroName) : false;
}

function expandMacroParam(ctx: Context, macroParam: TMacroParam, paramSep: number) {
	let paramTokens = null;
	let parm: TExprStackItem | undefined;
	if (macroParam.isInterpolated) {
		const start = ctx.lexer.tokenIdx;
		while (!ctx.lexer.eol() && !ctx.lexer.match([paramSep, TOKEN_TYPES.RIGHT_PARENT])) ctx.lexer.next();
		paramTokens = ctx.lexer.tokens.slice(start, ctx.lexer.tokenIdx);
		parm = TExprStackItem.newNumber(0);
	} else {
		parm = parseExpression(ctx, new Set([paramSep]));
	}

	if (!parm) throw new VAParseError(`MACRO: missing parameter value for ${macroParam.name}`);

	if (paramTokens) {
		if (!parm.extra) parm.extra = { isVariable: false };
		parm.extra.tokens = paramTokens;
	}

	return parm;
}

export function expandMacro(ctx: Context) {
	const macroName = ctx.lexer.identifier();
	if (!macroName) throw new VAParseError("MACRO: Missing name");

	// log("expandMacro", ctx.pass, tok);

	const macro = ctx.macros.get(macroName);
	if (!macro) throw new VAParseError(`MACRO: Unknown macro ${macroName}`);

	const paramsCount = macro.parms.length;

	// log("expandMacro line", ctx.lexer.line());

	ctx.lexer.next();

	// macro parm1 , parm2 , parmx
	// macro: parm1 : parm2 : parmx
	const paramSep = macro.wantAlternateSep ? TOKEN_TYPES.COLON : TOKEN_TYPES.COMMA;

	const parms = macro.hasRestParm ? macro.parms.slice(0, -1) : macro.parms;

	// log("expandMacro parms", parms);

	const hasParenthesis = ctx.lexer.isToken(TOKEN_TYPES.LEFT_PARENT);
	if (hasParenthesis) ctx.lexer.next();

	for (let idx = 0; idx < parms.length; idx++) {
		let parm: TExprStackItem | undefined = undefined;

		if (ctx.lexer.token()) {
			if (idx > 0) {
				// if (!ctx.lexer.isToken(TOKEN_TYPES.COMMA)) throw new VAParseError("MACRO: Syntax Error; Missing comma");
				// if (!ctx.lexer.isToken(TOKEN_TYPES.COMMA)) break;
				if (!ctx.lexer.isToken(paramSep)) break;
				ctx.lexer.next();
			}

			// log("expandMacro line", ctx.lexer.line());

			parm = expandMacroParam(ctx, parms[idx], paramSep);
		}

		if (idx < parms.length - 2 && ctx.lexer.eol()) {
			throw new VAParseError(`MACRO: ${macroName} needs ${parms.length} parameters; Got only ${idx + 1}`);
		}

		if (!parm) throw new VAParseError(`MACRO: missing parameter value for ${parms[idx].name}`);

		// log("expandMacro", parms[idx], parm);

		// TODO: parm.type: number | null => not undefined
		// we're using a label as parm but it's not yet defined (will be on pass 2)
		if (ctx.pass === 1 && parm.type === undefined) {
			parm.renew(TOKEN_TYPES.NUMBER, 0);
			// parm = TExprStackItem.newNumber(0);
		}

		// if(ctx.pass == 2)
		ctx.symbols.override.override(parms[idx].name, parm);
	}

	if (macro.hasRestParm) {
		if (macro.parms.length > 1) {
			if (!ctx.lexer.isToken(paramSep))
				throw new VAParseError("MACRO: Syntax Error; Missing parameter separator (, or :)");
			ctx.lexer.next();
		}
		const restParm = macro.parms[macro.parms.length - 1];
		const restArray = [];
		while (ctx.lexer.token()) {
			// log("expandMacro REST token", ctx.lexer.token());

			restArray.push(expandMacroParam(ctx, restParm, paramSep));

			// log("expandMacro REST parm", parm);

			// if (ctx.lexer.token() && !ctx.lexer.isToken(TOKEN_TYPES.COMMA))
			// 	throw new VAParseError("MACRO: Syntax Error; Missing comma");
			if (!ctx.lexer.isToken(paramSep)) break;

			ctx.lexer.next();
		}

		ctx.symbols.override.override(restParm.name, new TExprStackItem(TOKEN_TYPES.ARRAY, restArray));
	}

	if (hasParenthesis) {
		if (!ctx.lexer.isToken(TOKEN_TYPES.RIGHT_PARENT)) {
			throw new VAParseError("MACRO: Syntax Error; Missing closing parenthesis");
		}
		ctx.lexer.next();
	}

	if (!ctx.lexer.eol()) throw new VAParseError("MACRO: Syntax Error; Extra/Unknown parameter");

	const onEndOfBlock = () => {
		for (const param of macro.parms) {
			ctx.symbols.override.restore(param.name);
		}
	};

	// if(ctx.pass==2) {
	ctx.lexer.pushSource(macro.block, ctx.lexer.pos().line);
	if (paramsCount) ctx.lexer.addEventListener(EVENT_TYPES.EOS, onEndOfBlock);
	// }
}
