import { VAParseError } from "../helpers/errors.class.js";
import { EVENT_TYPES, TOKEN_TYPES } from "../lexer/lexer.class.js";
import { readBlock } from "../parsers/block.parser.js";
import { parseExpression } from "../parsers/expression.parser.js";

export function processRepeat(ctx) {

	const count= parseExpression(ctx);

	if(count.type != TOKEN_TYPES.NUMBER)
		throw new VAParseError("Need a number");

	let iterator= null;
	if(ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER)) {
		iterator= ctx.lexer.token();
		ctx.lexer.next();
	}

	const block= readBlock(ctx);

	for(let idx= 0; idx<count.value; idx++)
		ctx.lexer.pushSource(block);

	if(!iterator)
		return true;

	const IteratorName= iterator.value;
	const IteratorValue= {type: TOKEN_TYPES.NUMBER, value: 0};

	ctx.symbols.override(IteratorName, IteratorValue);

	const onEndOfBlock= () => {
		IteratorValue.value++;
		if(IteratorValue.value>=count.value) {
			ctx.lexer.removeEventListener(EVENT_TYPES.EOS, onEndOfBlock)
			ctx.symbols.restore(iterator.value);
		}
	}
	ctx.lexer.addEventListener(EVENT_TYPES.EOS, onEndOfBlock);			
	return true;

}
