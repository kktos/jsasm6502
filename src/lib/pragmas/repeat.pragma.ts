import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { EVENT_TYPES } from "../lexer/lexer.class";
import { TOKEN_TYPES, Token } from "../lexer/token.class";
import { readBlock } from "../parsers/block.parser";
import { parseExpression } from "../parsers/expression/expression.parser";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
/*
	.REPEAT <count> [<iterator>]
	<block to repeat>
	.END
 */
export function processRepeat(ctx: Context) {
	const count = parseExpression(ctx, undefined, TOKEN_TYPES.NUMBER);
	if (!count) throw new VAParseError("REPEAT: need a count");

	let iterator: Token | null = null;
	if (ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER)) {
		iterator = ctx.lexer.token();
		ctx.lexer.next();
	}

	const [block] = readBlock(ctx);
	if (!block) throw new VAParseError("REPEAT: empty block");

	let onEndOfBlock: (() => void) | null = null;
	if (iterator) {
		const IteratorName = iterator.asString;
		const IteratorValue = TExprStackItem.newNumber(0); // { type: TOKEN_TYPES.NUMBER, value: 0 };

		ctx.symbols.override.override(IteratorName, IteratorValue);

		onEndOfBlock = () => {
			IteratorValue.number++;
			if (IteratorValue.number >= count.number) {
				// ctx.lexer.removeEventListener(EVENT_TYPES.EOS, onEndOfBlock)
				ctx.symbols.override.restore((iterator as Token).asString);
			}
		};
	}

	for (let idx = 0; idx < count.number; idx++) {
		ctx.lexer.pushSource(block);
		onEndOfBlock && ctx.lexer.addEventListener(EVENT_TYPES.EOS, onEndOfBlock);
	}

	return true;
}
