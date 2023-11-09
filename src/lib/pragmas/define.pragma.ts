import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { getValueType } from "../helpers/utils";
import { TOKEN_TYPES } from "../lexer/token.class";
import { readBlock } from "../parsers/block.parser";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
import { TValueType } from "../types/Value.type";

export function processDefine(ctx: Context) {
	const tok = ctx.lexer.token();
	if (!tok || tok.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError("DEFINE: need a name");

	const name = tok.asString;
	const [block] = readBlock(ctx);
	let value: TValueType;
	try {
		if (!block) throw new VAParseError("Empty block");
		value = ctx.YAMLparse(block.replace(/\t/g, " "));
	} catch (e) {
		throw new VAParseError(`Invalid YAML/JSON : ${(e as Error).message}`);
	}

	if (ctx.pass === 1 && ctx.symbols.exists(name)) throw new VAParseError(`Duplicate Symbol : ${name}`);

	ctx.symbols.set(name, new TExprStackItem(getValueType(value) ?? 0, value)); // { type: getValueType(value), value }

	return true;
}
