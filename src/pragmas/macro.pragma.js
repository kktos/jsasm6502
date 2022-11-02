import { VAParseError } from "../helpers/errors.class.js";
import { EVENT_TYPES, TOKEN_TYPES } from "../lexer/lexer.class.js";
import { readBlock } from "../parsers/block.parser.js";
import { parseExpression } from "../parsers/expression.parser.js";

const macros= {};

export function processMacro(ctx, pragma) {

	const macro= { parms:[], block: null};

	if(!ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
		throw new VAParseError("MACRO: Need a name");

	const macroName= ctx.lexer.token().value.toUpperCase();

	ctx.lexer.next();

	while(ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER)) {
		const parmName= ctx.lexer.token().value;
		macro.parms.push(parmName);
		ctx.lexer.next();
		if(ctx.lexer.isToken(TOKEN_TYPES.COMMA) && !ctx.lexer.isLookahead(TOKEN_TYPES.IDENTIFIER))
			throw new VAParseError("MACRO:Missing a parameter name");;
		ctx.lexer.next();
	}	

	const [block]= readBlock(ctx);
	macro.block= block;

	if(ctx.pass == 1) {
		if(macros[macroName] != undefined)
			throw new VAParseError(`MACRO: "${macroName}" is already defined`);
		macros[macroName]= macro;
		console.log(macroName, macro);
	}
	

}

export function isMacroToken(ctx) {
	const currTok= ctx.lexer.token();

	// console.log("isMacroToken", currTok);

	return 	currTok.type == TOKEN_TYPES.IDENTIFIER &&
			macros[currTok.value] != undefined;
}

export function expandMacro(ctx) {
	const macro= macros[ctx.lexer.token().value];
	const hasParams= macro.parms.length>0;
	let onEndOfBlock;
	ctx.lexer.next();

	if(hasParams) {
		macro.parms.forEach(name => {
			if(!ctx.lexer.token())
				throw new VAParseError(`MACRO: missing parameter ${name}`);
			const parm= parseExpression(ctx);
			// console.log(name, parm);
			if(ctx.pass == 2) {
				ctx.symbols.override(name, parm);			
			}
		});
		onEndOfBlock= () => {
			macro.parms.forEach(name => {
				ctx.symbols.restore(name);
			});
		}
	}

	if(ctx.pass==2) {
		ctx.lexer.pushSource(macro.block);
		if(hasParams)
			ctx.lexer.addEventListener(EVENT_TYPES.EOS, onEndOfBlock);
	}

}
/*

import { getExpression } from "../expression.js";
import { ET_S, logError, logLine } from "../log.js";
import { delNStempEntry, setNStempEntry } from "../namespace.js";
import { nextLine, registerNextLineHandler } from "../tokenizer.js";
import { readBlock } from "./block.utils.js";

export function processMacro(ctx, pragma) {

	// console.log("processMacro", pragma);

	if(ctx.pass == 1)
		ctx.pict= "."+pragma+" ";

	if(ctx.sym.length <= ctx.ofs) {
		logError(ctx, ET_S, 'macro name expected');
		return false;
	}

	const name= ctx.sym[ctx.ofs];
	const macro= {
		locals: [],
		lines: null
	};

	if(ctx.pass == 1)
		ctx.pict+= name;

	for(let idx= ctx.ofs+1; idx< ctx.sym.length; idx++) {
		macro.locals.push({ name: ctx.sym[idx], value: undefined});
		if(ctx.pass == 1)
			ctx.pict+= " "+ctx.sym[idx];
	}

	if(ctx.pass == 1)
		logLine(ctx);

	macro.lines= readBlock(ctx);
	if(!macro.lines)
		macro.lines= [];

	// remove empty lines
	macro.lines= macro.lines.filter(line=>line.tokens.length);
	
	ctx.macros[name]= macro;

	if(ctx.pass == 1 && macro.lines.length == 0)
		logError(ctx, "WARNING", `macro ${name} is empty`, true);
	return true;
}

function nextMacroLine(ctx, macroCtx) {
	if(macroCtx.lineIdx >= macroCtx.lines.length) {
		// getNSentry(ctx, "%locals%").v= null;
		macroCtx.locals.forEach( local => delNStempEntry(ctx, local) );
		return false;
	} else {
		const line= macroCtx.lines[macroCtx.lineIdx++];
		ctx.rawLine= line.raw;
		ctx.sym= [...line.tokens];
		return true;
	}
}

export function expandMacro(ctx, name) {

	switch(ctx.pass) {
		case 1:
			ctx.pict= name + " " + ctx.sym.slice(ctx.ofs).join(" ");
			logLine(ctx);
			break;

		case 2: {
			const macroCtx= {
				name,
				lineIdx: 0,
				parmCount: 0,
				lines: ctx.macros[name].lines,
				locals: [...ctx.macros[name].locals]
			};
			registerNextLineHandler(name, () => nextMacroLine(ctx, macroCtx));

			// getNSentry(ctx, "%locals%").v= macroCtx.locals;

			for(let idx= ctx.ofs; idx< ctx.sym.length; idx++) {
				const result= getExpression(ctx, ctx.sym[idx]);

				if(result.error) {
					ctx.pict= ctx.sym.slice(0, idx).join(" ") + " " + result.pict;
					logError(ctx, result.et, result.error);
					return false;
				}

				macroCtx.parmCount++;
				const local= macroCtx.locals[idx-ctx.ofs];
				if(local)
					local.value= result.v;
			}

			macroCtx.locals.push({ name: ".PARAMCOUNT", value: macroCtx.parmCount})

			macroCtx.locals.forEach( local => setNStempEntry(ctx, local) );

			break;
		}
	}

	nextLine(ctx);
	return true;
}

*/