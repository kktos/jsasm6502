import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { readBlock } from "../parsers/block.parser.js";
import { parseExpression } from "../parsers/expression.parser.js";

export function processIf(ctx, pragma) {

	const res= parseExpression(ctx);

	if(res.type != TOKEN_TYPES.NUMBER)
		throw new VAParseError("Need a number");
		
	// console.log("processIf", res.value !=0);

	const block= readBlock(ctx);
	
	// console.log("processIf [");
	// console.log(block);
	// console.log("]");

	if(res.value !=0)
		ctx.lexer.pushSource(block);

	return true;
}
