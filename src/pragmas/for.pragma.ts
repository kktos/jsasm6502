import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { EVENT_TYPES } from "../lexer/lexer.class";
import { TOKEN_TYPES, Token, tokenTypeOf } from "../lexer/token.class";
import { readBlock } from "../parsers/block.parser";
import { TExprStackItem, TExprStackItemValueType, parseExpression } from "../parsers/expression.parser";

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

	const array = list?.value as unknown[];

	// log("FOR list", ctx.pass, list);

	const [block] = readBlock(ctx);
	if (!block) throw new VAParseError("FOR: empty block");

	if (array.length === 0) return;

	const IteratorName = iterator.asString;
	let arrayItem: unknown;
	let arrayItemType: number | null = 0;
	let arrayIdx = 0;
	const IteratorValue: TExprStackItem = { type: 0, value: 0 };

	const getItem = (idx: number) => {
		arrayItem = array[idx];
		arrayItemType = tokenTypeOf(arrayItem);
		if (!arrayItemType) throw new VAParseError(`FOR: Invalid type for item ${idx}`);
		IteratorValue.type = arrayItemType;
		IteratorValue.value = arrayItem as TExprStackItemValueType;
	};

	getItem(arrayIdx);

	ctx.symbols.override(IteratorName, IteratorValue as TExprStackItem);

	const onEndOfBlock = () => {
		arrayIdx++;

		// log("arrayIdx", arrayIdx);

		if (arrayIdx >= array.length) {
			// ctx.lexer.removeEventListener(EVENT_TYPES.EOS, onEndOfBlock)
			ctx.symbols.restore((iterator as Token).asString);
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
