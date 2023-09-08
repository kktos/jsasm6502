import { VAParseError } from "../helpers/errors.class.js";
import { EVENT_TYPES, TOKEN_TYPES } from "../lexer/lexer.class.js";
import { readBlock } from "../parsers/block.parser.js";
import { parseExpression } from "../parsers/expression.parser.js";

const macros = {};

export function processMacro(ctx, pragma) {
	const macro = { parms: [], block: null, hasRestParm: false };

	if (!ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
		throw new VAParseError("MACRO: Need a name");

	const macroName = ctx.lexer.token().value.toUpperCase();

	ctx.lexer.next();

	let isLastParam = false;
	while (ctx.lexer.match([TOKEN_TYPES.IDENTIFIER, TOKEN_TYPES.REST])) {
		if (ctx.lexer.isToken(TOKEN_TYPES.REST)) {
			isLastParam = true;
			ctx.lexer.next();
			macro.hasRestParm = true;
		}

		const parmName = ctx.lexer.token().value;
		macro.parms.push(parmName);

		ctx.lexer.next();

		if (!ctx.lexer.token()) break;

		if (!ctx.lexer.isToken(TOKEN_TYPES.COMMA))
			throw new VAParseError(
				"MACRO: Syntax Error; Needs a comma beween parameter",
			);

		ctx.lexer.next();
		// if(!ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
		// 	throw new VAParseError("MACRO: Missing a parameter name");
	}

	const [block] = readBlock(ctx);
	macro.block = block;

	if (ctx.pass === 1) {
		if (macros[macroName] !== undefined)
			throw new VAParseError(`MACRO: "${macroName}" is already defined`);
		macros[macroName] = macro;
	}
}

export function isMacroToken(ctx) {
	const currTok = ctx.lexer.token();

	return (
		currTok.type === TOKEN_TYPES.IDENTIFIER &&
		macros[currTok.value] !== undefined
	);
}

export function expandMacro(ctx) {
	const macro = macros[ctx.lexer.token().value];
	const paramsCount = macro.parms.length;

	ctx.lexer.next();

	const parms = macro.hasRestParm ? macro.parms.slice(0, -1) : macro.parms;
	parms.forEach((name, idx) => {
		let parm = null;

		if (ctx.lexer.token()) {
			if (idx > 0) {
				if (!ctx.lexer.isToken(TOKEN_TYPES.COMMA))
					throw new VAParseError("MACRO: Syntax Error; Missing comma");
				ctx.lexer.next();
			}

			parm = parseExpression(ctx, new Set([TOKEN_TYPES.COMMA]));
		}

		// if(ctx.pass == 2)
		ctx.symbols.override(name, parm);
	});

	if (macro.hasRestParm) {
		if (macro.parms.length > 1) {
			if (!ctx.lexer.isToken(TOKEN_TYPES.COMMA))
				throw new VAParseError("MACRO: Syntax Error; Missing comma");
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
		macro.parms.forEach((name) => {
			ctx.symbols.restore(name);
		});
	};

	// if(ctx.pass==2) {
	ctx.lexer.pushSource(macro.block);
	if (paramsCount) ctx.lexer.addEventListener(EVENT_TYPES.EOS, onEndOfBlock);
	// }
}
