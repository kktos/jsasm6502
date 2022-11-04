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
		
		if(ctx.lexer.token()) {
			if(!ctx.lexer.isToken(TOKEN_TYPES.COMMA))
				throw new VAParseError("MACRO: Syntax Error; Needs a comma beween parameter");

			ctx.lexer.next();
			if(!ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
				throw new VAParseError("MACRO: Missing a parameter name");
		}
		
	}	

	const [block]= readBlock(ctx);
	macro.block= block;

	if(ctx.pass == 1) {
		if(macros[macroName] != undefined)
			throw new VAParseError(`MACRO: "${macroName}" is already defined`);
		macros[macroName]= macro;
		// console.log(macroName, macro);
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
	const paramsCount= macro.parms.length;
	
	ctx.lexer.next();

	macro.parms.forEach((name, idx) => {
		let parm= null;

		if(ctx.lexer.token()) {
			
			if(idx>0) {
				if(!ctx.lexer.isToken(TOKEN_TYPES.COMMA))
					throw new VAParseError(`MACRO: Syntax Error; Missing comma`);
				ctx.lexer.next();
			}

			parm= parseExpression(ctx, new Set([TOKEN_TYPES.COMMA]));
		}

		if(ctx.pass == 2)
			ctx.symbols.override(name, parm);
	});

	const onEndOfBlock= () => {
		macro.parms.forEach(name => {
			ctx.symbols.restore(name);
		});
	}

	if(ctx.pass==2) {
		ctx.lexer.pushSource(macro.block);
		if(paramsCount)
			ctx.lexer.addEventListener(EVENT_TYPES.EOS, onEndOfBlock);
	}

}
