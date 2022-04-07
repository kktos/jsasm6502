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

	if(macro.lines.length == 0)
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
