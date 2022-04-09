import { ET_S, logError, logLine } from "../log.js";
import { setNSentry } from "../namespace.js";
import { readBlock } from "./block.utils.js";

/*
	.define <VARIABLE NAME>
		<YAML/JSON CONTENT>
	.end
*/

export function processDefine(ctx, pragma) {
	if(ctx.pass == 1)
		ctx.pict= "."+pragma+" ";

	if (ctx.sym.length-ctx.ofs < 1) {
		logError(ctx, ET_S, 'name expected');
		return false;
	}

	const name= ctx.sym[ctx.ofs];
	
	if(ctx.pass == 1) {
		ctx.pict+= name;
		logLine(ctx);		
	}

	const block= readBlock(ctx);
	const json= block
					.filter(item=>item.tokens.length)
					.map(item=>item.raw)
					.join("\n");

	let data;
	try {
		data= ctx.YAMLparse(json);
	}
	catch (e) {
		logError(ctx, ET_S, "invalid data " + e.message);
		return false;
	}

	if(ctx.pass == 2)
		setNSentry(ctx, name, {v:data, error:false, isWord: false});

	return true;
}