import { VAParseError } from "../helpers/errors.class.js";
import { getValueType } from "../helpers/utils.js";
import { readBlock } from "../parsers/block.parser.js";

export function processDefine(ctx) {
	const name = ctx.lexer.token().value;
	const [block] = readBlock(ctx);
	let value;
	try {
		value = ctx.YAMLparse(block.replace(/\t/g, " "));
	} catch (e) {
		throw new VAParseError(`Invalid YAML/JSON : ${e.message}`);
	}

	if(ctx.pass === 1 && ctx.symbols.exists(name))
		throw new VAParseError(`Duplicate Symbol : ${name}`);

	ctx.symbols.set(name, { type: getValueType(value), value });

	return true;
}
