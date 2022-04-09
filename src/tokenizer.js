import { logMsg } from "./log.js";
import { COMMENT_CHAR } from "./utils.js";

const whitespaces= [" ", "\t"];
const token_separators= ["(", ")", "+", "-", "/", "*", ",", "#", "="];
const digit_characters= ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const hexa_characters= [...digit_characters, "A", "B", "C", "D", "E", "F"];
const NEWLINE= "\n";
const EOF= "EOF";

function getChar(ctx, isQuote) {
	if(ctx.srcLineIdx >= ctx.codesrc.length)
		return EOF;

	if(ctx.srcc >= ctx.codesrc[ctx.srcLineIdx].length) {
		ctx.srcc= 0;
		ctx.srcLineIdx++;
		return NEWLINE;
	}

	const c= ctx.codesrc[ctx.srcLineIdx].charAt(ctx.srcc++);
	if(c==';' && !isQuote) {
		ctx.comment= (ctx.pass==1 ? c : COMMENT_CHAR) + ctx.codesrc[ctx.srcLineIdx].slice(ctx.srcc);
		ctx.srcc= 0;
		ctx.srcLineIdx++;
		return NEWLINE;
	} else {
		ctx.rawLine+= c;
	}

	return c;
}

export function tokenizeNextLine(ctx) {
	if(ctx.comment) {
		logMsg(ctx.comment+'\n');
		ctx.comment= '';
	}
	ctx.rawLine= '';
	ctx.lineHasLabel= false;
	
	ctx.srcLineNumber= ctx.srcLineIdx+1;
	
	// console.log("tokenizeNextLine", ctx.srcLineIdx, ctx.codesrc[ctx.srcLineIdx]);
	
	let c= null;
	let tokens= [];
	let tokenIdx= 0;
	let m= 0;
	let quote= '';
	let isInQuote= false;
	let wantNextChar= true;

	tokens[0]= "";
	while(true) {
		if(wantNextChar)
			c= getChar(ctx);
			
		wantNextChar= true;
		
		// console.log("getChar", {c, m, isInQuote, quote});

		if(c==NEWLINE || c==EOF)
			break;

		if(isInQuote) {
			tokens[tokenIdx]+= c;
			if(c==quote) {
				quote= '';
				isInQuote= false;
				tokenIdx++;
				// m= 1;
			}
			continue;
		}

		if(m==0 && c=='!') {
			if(tokens[tokenIdx].length)
				tokenIdx++;
			tokens[tokenIdx]= c;
			m= 1;
			if(tokenIdx>1) {
				var c1= getChar(ctx, false);
				while (c1=='+' || c1=='-') {
					tokens[tokenIdx]+= c1;
					c1= getChar(ctx, false);
				}
				c= c1;
			}
			continue;
		}
		
		if(c=='"' || c=="'") {
			tokens[tokenIdx]+= c;
			// m= 2;
			isInQuote= true;
			quote= c;
			continue;
		}

		if(whitespaces.includes(c)) {
			if(m>0 && tokens[tokenIdx]?.length) {
				m=0;
				tokens[++tokenIdx]= '';
			}
			continue;
		}

		if(token_separators.includes(c)) {
			if(m>0)
				tokenIdx++;
			tokens[tokenIdx]= c;
			m= 0;
			tokens[++tokenIdx]= '';
			continue;
		}

		// base 10 numbers
		if(m==0 && digit_characters.includes(c)) {
			let numStr= "";
			while(digit_characters.includes(c)) {
				numStr+= c;
				c= getChar(ctx, false);
			}
			tokens[tokenIdx++]= parseInt(numStr);
			wantNextChar= false;
			continue;
		}

		// base 16 numbers
		if(m==0 && c=="$") {
			c= getChar(ctx, false);
			let numStr= "";
			while(hexa_characters.includes(c.toUpperCase())) {
				numStr+= c;
				c= getChar(ctx, false);
			}
			if(numStr!="") {
				wantNextChar= false;
				tokens[tokenIdx++]= parseInt(numStr, 16);
				continue;
			}
			tokens[tokenIdx]+= "$";
		}

		tokens[tokenIdx]+= c.toUpperCase();
		if(ctx.srcc==1) {
			ctx.lineHasLabel= true;
		}
		m= 1;


		// if (m<2 && separators.includes(c)) {
		// 	if (m>0) {
		// 		m= 0;
		// 		if (tokens[tokenIdx] && tokens[tokenIdx].length) {
		// 			tokens[++tokenIdx]= '';
		// 		}
		// 	}
		// }
		// else if(m<2 && parents.includes(c)) {
		// 	if(m>0)
		// 		tokenIdx++;
		// 	tokens[tokenIdx]= c;
		// 	m= 0;
		// 	tokens[++tokenIdx]= '';
		// }
		// else if(m<2 && (c=='=')) {
		// 	if(m>0)
		// 		tokenIdx++;
		// 	tokens[tokenIdx]= c;
		// 	m= 0;
		// 	tokens[++tokenIdx]= '';
		// }
		// else if(m==2) {
		// 	if(c==quote) {
		// 		tokens[tokenIdx]+= c;
		// 		quote= '';
		// 		m= 1;
		// 	}
		// 	else {
		// 		tokens[tokenIdx]+=c;
		// 	}
		// }
		// else if(c=='"' || c=="'") {
		// 	tokens[tokenIdx]+= c;
		// 	m= 2;
		// 	quote= c;
		// }
		// else if(m==0 && c=='!') {
		// 	if(tokens[tokenIdx].length)
		// 		tokenIdx++;
		// 	tokens[tokenIdx]= c;
		// 	m= 1;
		// 	if(tokenIdx>1) {
		// 		var c1= getChar(ctx, false);
		// 		while (c1=='+' || c1=='-') {
		// 			tokens[tokenIdx]+= c1;
		// 			c1= getChar(ctx, false);
		// 		}
		// 		c=c1;
		// 		continue;
		// 	}
		// }
		// else {
		// 	tokens[tokenIdx]+= c.toUpperCase();
		// 	if(ctx.srcc==1) {
		// 		ctx.lineHasLabel= true;
		// 	}
		// 	m=1;
		// }
		// c= getChar(ctx, m>=2);
		// console.log("getChar2", {c});
	}

	while(tokens.length && tokens[tokens.length-1]=='')
		tokens.length--;

	// console.log("tokenizeNextLine", tokens.join(" | "));
	
	return c==EOF? null: tokens;
}

const DEFAULT_NEXT_LINE_NAME = "%default%";
let nextLineHandlers= null;

export function registerNextLineHandler(name, fn) {
	const newHandler= {name, fn, prev: null, next: nextLineHandlers};
	if(nextLineHandlers)
		nextLineHandlers.prev= newHandler;
	nextLineHandlers= newHandler;
	return true;
}

export function nextLine(ctx) {
	let handler= nextLineHandlers;
	while(handler) {

		if(handler.fn(ctx))
			break;

		let prev= handler.prev;
		let next= handler.next;
		if(prev)
			prev.next= next;
		else
			nextLineHandlers= next;
		if(next)
			next.prev= prev;

		handler= next;
	}
}

registerNextLineHandler(DEFAULT_NEXT_LINE_NAME, (ctx) => {
	ctx.sym= tokenizeNextLine(ctx);
	return true;
});
