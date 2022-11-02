import { Context } from "./context.class.js";
import { VAParseError } from "./helpers/errors.class.js";
import { TOKEN_TYPES } from "./lexer/lexer.class.js";
import { parseLabel, parseLocalLabel } from "./parsers/label.parser.js";
import { parseOpcode } from "./parsers/opcode.parser.js";
import { parseOrg } from "./parsers/org.parser.js";
import { isPragmaToken, parsePragma } from "./parsers/pragma.parser.js";
import { expandMacro, isMacroToken } from "./pragmas/macro.pragma.js";
import { CPU_NAMES, setcpu } from "./pragmas/setcpu.pragma.js";

export function assemble(mainFilename, opts) {
	const ctx= new Context(opts, mainFilename);
	setcpu(ctx, CPU_NAMES.cpu6502);
	
	// first pass
	try {
		asm(ctx);
	}
	catch(err) {
		// handle internal errors
		if(err?.name?.match(/^VA/)) {
			ctx.error(err.message);
			return;
		}

		throw err;
	}

	ctx.reset();
	
	ctx.pass= 2;
	// second pass
	try {
		asm(ctx);
	}
	catch(err) {
		// handle internal errors
		if(err?.name?.match(/^VA/)) {
			ctx.error(err.message);
			return;
		}

		throw err;
	}

	Object.keys(ctx.code.segments).forEach(name => {
		console.log("SEGMENT", name);
		if(ctx.code.obj[name])
			ctx.code.dump(name);
	});

}

function asm(ctx) {
	while(!ctx.wannaStop && ctx.lexer.nextLine()) {

		let token= ctx.lexer.token();

		if(!token)
			continue;

		// console.log("---- LINE 0", ctx.lexer.line(), token);

		if(token.type == TOKEN_TYPES.INVALID)
			throw new VAParseError(`Invalid character ${token.value}`);
	
		const currLine= ctx.lexer.line();
		let label= null;

		const lblParser= (token) => {
			switch(token.type) {

				// LOCAL LABEL <!> <:>
				case TOKEN_TYPES.BANG:
				case TOKEN_TYPES.COLON:
					return parseLocalLabel(ctx);
					
				// LABEL <id>
				case TOKEN_TYPES.IDENTIFIER:
					return ctx.opcodes[token.value] != undefined || isMacroToken(ctx) ?
							null 
							: 
							parseLabel(ctx);

				// CHEAP LABEL <@> <id>
				case TOKEN_TYPES.AT:
					if(!ctx.lexer.isLookahead(TOKEN_TYPES.IDENTIFIER))
						return null;
					ctx.lexer.next();
					return parseLabel(ctx, true);
			}
		};

		while(true) {
			//
			// ORG as * = xxxx
			//
			if(ctx.lexer.token().type == TOKEN_TYPES.STAR) {
				parseOrg(ctx);
				break;
			}
	
			//
			// LABEL
			//
			label= lblParser(token);
			if(label)
				ctx.lastLabel= label;

			//
			// PRAGMA
			//
			if(isPragmaToken(ctx)) {
				parsePragma(ctx);

				// console.log("AFTER PRAGMA", ctx.lexer.token(), ctx.lexer.pos());
				break;
			}

			//
			// MACRO
			//
			if(isMacroToken(ctx)) {
				expandMacro(ctx);
				break;
			}
			
			//
			// OPCODE
			//
			if(ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
				parseOpcode(ctx);
			
			break;
		}

		if(ctx.lexer.token())
			throw new VAParseError("Syntax Error");

		if(ctx.pass == 2) {
			if(label)
				ctx.print(label+":");
	
			let listingLine= "";
			
			const asmOut = ctx.code.output;
			const wantAfter= asmOut?.length>21;

			if(asmOut && !wantAfter)
				listingLine+= asmOut;
	
			listingLine= listingLine.padEnd(18);

			listingLine+= currLine;

			if(asmOut && wantAfter)
				listingLine+= "\n" + asmOut;
	
			ctx.print(listingLine);
		}
		
	}
	
	ctx.wannaStop= false;
}