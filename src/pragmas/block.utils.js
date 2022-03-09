import { logLine } from "../log.js";
import { isPragmaBlock } from "../pragma.js";
import { nextLine } from "../tokenizer.js";

export function readBlock(ctx) {
	const lines= [];
	let tokens;

	const tokenize= (ctx) => {
		nextLine(ctx);
		// console.log("readBlock", ctx.sym);
		return ctx.sym;
	};

	const getPragma= (idx) => {
		const tok= tokens[idx];
		return tok[0] == "." ? tok.slice(1) : null;
	}

	let blockLevel= 0;
	while(tokens= tokenize(ctx)) {
		if(ctx.pass == 1) {
			ctx.pict= ctx.rawLine.trim().toUpperCase();
			logLine(ctx);
		}

		// keep track of the block level
		// get info from pragma.pragmaDefs[pragma].isBlock

		if(tokens.length) {
			let pragma= getPragma(0);

			if(!pragma && tokens.length>1)
			pragma= getPragma(1);

			isPragmaBlock(pragma) && blockLevel++;

			if(pragma == "END") {
				if(!blockLevel) {
					if(ctx.pass == 1) {
						logLine(ctx);
					}
					return lines.length ? lines : null;
				}
				blockLevel--;
			}
		}

		lines.push({raw: ctx.rawLine.trim(), tokens});
	}
}
