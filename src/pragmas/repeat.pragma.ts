import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { EVENT_TYPES } from "../lexer/lexer.class";
import { TOKEN_TYPES, Token } from "../lexer/token.class";
import { readBlock } from "../parsers/block.parser";
import { TExprStackItemNumber, parseExpression } from "../parsers/expression/expression.parser";
/*
	.REPEAT <count> [<iterator>]
	<block to repeat>
	.END
 */
export function processRepeat(ctx: Context) {
	const count = parseExpression(ctx, undefined, TOKEN_TYPES.NUMBER) as TExprStackItemNumber;

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
		const IteratorValue = { type: TOKEN_TYPES.NUMBER, value: 0 };

		ctx.symbols.override(IteratorName, IteratorValue);

		onEndOfBlock = () => {
			IteratorValue.value++;
			if (IteratorValue.value >= count.value) {
				// ctx.lexer.removeEventListener(EVENT_TYPES.EOS, onEndOfBlock)
				ctx.symbols.restore((iterator as Token).asString);
			}
		};
	}

	for (let idx = 0; idx < count.value; idx++) {
		ctx.lexer.pushSource(block);
		onEndOfBlock && ctx.lexer.addEventListener(EVENT_TYPES.EOS, onEndOfBlock);
	}

	return true;
}
