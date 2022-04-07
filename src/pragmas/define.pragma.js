import { ET_S, logError } from "../log.js";
import { readBlock } from "./block.utils.js";

/*
	.define $VARIABLE_NAME
		$JSON_CONTENT
	.end
*/

export function processDefine(ctx, pragma) {

	const block= readBlock(ctx);
	const json= block
					.filter(item=>item.tokens.length)
					.map(item=>item.raw)
					.join("\n");

	let data;
	try {
		// data= JSON.parse(json);
		data= ctx.YAMLparse(json);
	}
	catch (e) {
		logError(ctx, ET_S, "invalid data " + e.message);
		return false;
	}

	console.log("");
	console.log("DEFINE", data);
	console.log("");

	return true;
}