import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { EVENT_TYPES } from "../lexer/lexer.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { readBlock } from "../parsers/block.parser";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
import { addLabel } from "../parsers/label.parser";

const _log = console.log;

export function processFunction(ctx: Context) {
	const token = ctx.lexer.token();
	if (token?.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError("Need a function name");

	if (ctx.pass === 1) ctx.symbols.fn.declare(token.asString);

	addLabel(ctx, token.asString, TExprStackItem.newNumber(ctx.code.pc));

	// log("processFunction", token.asString, ctx.symbols.dump());
	ctx.lexer.next();

	const [block] = readBlock(ctx, {});

	// log(block);

	ctx.lexer.pushSource(block);

	ctx.symbols.fn.enter(token.asString);

	const onEndOfBlock = () => {
		ctx.symbols.fn.leave();
	};

	ctx.lexer.addEventListener(EVENT_TYPES.EOS, onEndOfBlock);

	return true;
}
