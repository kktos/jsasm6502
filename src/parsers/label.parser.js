import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { parseExpression } from "../parsers/expression.parser.js";

export function parseLocalLabel(ctx) {
	ctx.lexer.next();
	
	if(ctx.pass > 1)
		return;
	
	ctx.symbols.addMarker(ctx.code.pc);
	
	return null;
}

/*
LABEL
CONST = expr
 */
export function parseLabel(ctx, isCheap= false) {

	// console.log("PARSELABEL", {line:ctx.lexer.line()});

	const name= ctx.lexer.token().value;
	let value= { type: TOKEN_TYPES.NUMBER, value: ctx.code.pc};

	ctx.lexer.next();

	if(isCheap) {
		if(ctx.lexer.isToken(TOKEN_TYPES.COLON))
			ctx.lexer.next();
			
		if(ctx.pass > 1)
			return null;
			
		if(!ctx.symbols.addCheap(ctx.lastLabel, name, value))
			throw new VAExprError("Duplicate Cheap Label");
		
		return null;
	}

	switch(ctx.lexer.token().type) {
		// CONST = expr
		case TOKEN_TYPES.EQUAL: {
			ctx.lexer.next();
			value= parseExpression(ctx);
			ctx.symbols.set(name, value);
			return null;
		}
		// LABEL :
		case TOKEN_TYPES.COLON:
			ctx.lexer.next();
			if(ctx.pass == 1)
				ctx.symbols.set(name, value);
			return name;
	}
	
	return null;
}