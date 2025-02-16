import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { EVENT_TYPES } from "../lexer/lexer.class";
import { TOKEN_TYPES, type Token, tokenTypeOf } from "../lexer/token.class";
import { readBlock } from "../parsers/block.parser";
import { parseExpression } from "../parsers/expression/expression.parser";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
import type { TValueType } from "../types/Value.type";

const log = console.log;

/*
	.FOR <iterator> OF <array>
	<block to repeat>
	.END
 */
export function processFor(ctx: Context) {
	const iterator = ctx.lexer.token();
	if (!iterator || iterator.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError("FOR: need an iterator");

	ctx.lexer.next();

	if (!ctx.lexer.isIdentifier("OF")) throw new VAParseError("FOR: missing OF <array>");

	ctx.lexer.next();

	if (!iterator || iterator.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError("FOR: need an iterator");

	// log("FOR iterator", ctx.pass, iterator);

	const list = parseExpression(ctx, undefined, TOKEN_TYPES.ARRAY);
	if (!list) throw new VAParseError("FOR: need an array to iterate of");

	const array = list?.value as TValueType[];

	// log("FOR list", ctx.pass, list);

	const [block] = readBlock(ctx);
	if (!block) throw new VAParseError("FOR: empty block");

	if (array.length === 0) return true;

	const IteratorName = iterator.asString;
	let arrayItem: TValueType;
	let arrayItemType: number | null = 0;
	let arrayIdx = 0;
	const IteratorValue: TExprStackItem = new TExprStackItem(0, 0);

	const getItem = (idx: number) => {
		arrayItem = array[idx];
		if (arrayItem instanceof TExprStackItem) {
			IteratorValue.renew(arrayItem.type ?? 0, arrayItem.value);
		} else {
			arrayItemType = tokenTypeOf(arrayItem);
			if (!arrayItemType) throw new VAParseError(`FOR: Invalid type for item ${idx}`);
			IteratorValue.renew(arrayItemType, arrayItem);
		}
	};

	getItem(arrayIdx);

	ctx.symbols.override.override(IteratorName, IteratorValue);

	const onEndOfBlock = () => {
		arrayIdx++;

		// log("arrayIdx", arrayIdx);

		if (arrayIdx >= array.length) {
			// ctx.lexer.removeEventListener(EVENT_TYPES.EOS, onEndOfBlock)
			ctx.symbols.override.restore((iterator as Token).asString);
			return;
		}
		getItem(arrayIdx);
	};

	for (let idx = 0; idx < array.length; idx++) {
		ctx.lexer.pushSource(block);
		onEndOfBlock && ctx.lexer.addEventListener(EVENT_TYPES.EOS, onEndOfBlock);
	}

	return true;
}
