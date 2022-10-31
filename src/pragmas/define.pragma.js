import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { readBlock } from "../parsers/block.parser.js";

/*
	.define <VARIABLE NAME>
		<YAML/JSON CONTENT>
	.end
*/

export function processDefine(ctx) {
	const name= ctx.lexer.token().value;
	const block= readBlock(ctx);
	let value;
	try {
		value= ctx.YAMLparse(block.replace(/\t/g," "));
	}
	catch (e) {
		throw new VAParseError("Invalid YAML/JSON : "+e.message);
	}

	// console.log("processDefine", { type, value });

	ctx.symbols.set(name, { type: getValueType(value), value });

	return true;
}

export function getValueType(value) {
	switch(typeof value) {
		case "number":
			return TOKEN_TYPES.NUMBER;
		case "string":
			return TOKEN_TYPES.STRING;
		case "object":
			return Array.isArray(value) ? TOKEN_TYPES.ARRAY : TOKEN_TYPES.OBJECT;
		default:
			throw new VAParseError("Unknown data type : "+typeof value);
	}
}