import { commentChar } from "./utils.js";

function getChar(ctx, isQuote) {
	if(ctx.srcLineIdx >= ctx.codesrc.length)
		return 'EOF';
	if(ctx.srcc >= ctx.codesrc[ctx.srcLineIdx].length) {
		ctx.srcc= 0;
		ctx.srcLineIdx++;
		return '\n';
	} else {
		const c= ctx.codesrc[ctx.srcLineIdx].charAt(ctx.srcc++);
		if(!isQuote && (c==';')) {
			ctx.comment= ctx.pass==1 ? c : commentChar;
			while(ctx.srcc<ctx.codesrc[ctx.srcLineIdx].length) {
				const c1= ctx.codesrc[ctx.srcLineIdx].charAt(ctx.srcc++);
				ctx.comment+= c1;
			}
		} else {
			ctx.rawLine+=c;
		}
		return c;
	}
}

const separators= [" ", "\t", ","];
const parents= ["(", ")"];

export function tokenizeNextLine(ctx) {
	if(ctx.comment) {
		ctx.listing+= ctx.comment+'\n';
		ctx.comment= '';
	}
	ctx.rawLine= '';

	ctx.srcLineNumber= ctx.srcLineIdx+1;

	let c= getChar(ctx);
	if(c=='EOF')
		return null;

	let sym= [''],
		s= 0,
		m= 0,
		quote= '';

	while (!(c==';' && !quote) && c!='\n' && c!='EOF') {
		if (m<2 && separators.includes(c)) {
			if (m>0) {
				m= 0;
				if (sym[s] && sym[s].length) {
					sym[++s]= '';
				}
			}
		}
		else if(m<2 && parents.includes(c)) {
			if(m>0)
				s++;
			sym[s]= c;
			m= 0;
			sym[++s]= '';
		}
		else if(m<2 && (c=='=')) {
			if(m>0)
				s++;
			sym[s]= c;
			m= 0;
			sym[++s]= '';
		}
		else if(m==2) {
			if(c==quote) {
				sym[s]+= c;
				quote= '';
				m= 1;
			}
			else {
				sym[s]+=c;
			}
		}
		else if(c=='"' || c=="'") {
			sym[s]+= c;
			m= 2;
			quote= c;
		}
		else if(m==0 && c=='!') {
			if(sym[s].length)
				s++;
			sym[s]= c;
			m= 1;
			if(s>1) {
				var c1= getChar(ctx, false);
				while (c1=='+' || c1=='-') {
					sym[s]+= c1;
					c1= getChar(ctx, false);
				}
				c=c1;
				continue;
			}
		}
		else {
			sym[s]+= c.toUpperCase();
			m=1;
		}
		c= getChar(ctx, m>=2);
	}

	while(sym.length && sym[sym.length-1]=='')
		sym.length--;

	// console.log({filename:ctx.filename, srcLineIdx: ctx.srcLineIdx, rawLine:ctx.rawLine, sym});

	return c=='EOF'? null: sym;
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
