import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { getValueType } from "../helpers/utils";
import { TOKEN_TYPES } from "../lexer/token.class";
import { readBlock } from "../parsers/block.parser";
import { TExprStackItemValueType } from "../parsers/expression/expression.parser";

export function processDefine(ctx: Context) {
	const tok = ctx.lexer.token();
	if (!tok || tok.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError("DEFINE: need a name");

	const name = tok.asString;
	const [block] = readBlock(ctx);
	let value: TExprStackItemValueType;
	try {
		if (!block) throw new VAParseError("Empty block");
		value = ctx.YAMLparse(block.replace(/\t/g, " "));
	} catch (e) {
		throw new VAParseError(`Invalid YAML/JSON : ${(e as Error).message}`);
	}

	if (ctx.pass === 1 && ctx.symbols.exists(name)) throw new VAParseError(`Duplicate Symbol : ${name}`);

	ctx.symbols.set(name, { type: getValueType(value), value });

	return true;
}
