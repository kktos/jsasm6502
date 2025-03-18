import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { getValueType } from "../helpers/utils";
import { readBlock } from "../parsers/block.parser";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
import type { TValueType } from "../types/Value.type";

export function processDefine(ctx: Context) {
	const name = ctx.lexer.identifier();
	if (!name) throw new VAParseError("DEFINE: need a name");

	ctx.lexer.next();

	let block = null;

	// if all in one line like: .segment { start: $1000, end: $1100 }
	const unparsedLine = ctx.lexer.unparsedLine();
	if (unparsedLine?.match(/^\{/) && unparsedLine?.match(/\}$/)) {
		block = unparsedLine;
		while (ctx.lexer.next());
	}

	[block] = readBlock(ctx, { wantRaw: true });

	let value: TValueType;
	try {
		if (!block) throw new VAParseError("Empty block");
		value = ctx.YAMLparse(block.replace(/\t/g, " "));
	} catch (e) {
		throw new VAParseError(`Invalid YAML/JSON : ${(e as Error).message}`);
	}

	if (ctx.pass === 1 && ctx.symbols.exists(name)) throw new VAParseError(`Duplicate Symbol : ${name}`);

	ctx.symbols.set(name, new TExprStackItem(getValueType(value) ?? 0, value));

	return true;
}
