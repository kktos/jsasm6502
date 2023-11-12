import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

const log = console.log;

export function fnEval(ctx: Context, parms: (TExprStackItem | undefined)[]) {
	const parm = parms[0];
	if (!parm || parm.type !== TOKEN_TYPES.STRING)
		throw new VAParseError(`EVAL: Parameter should be a string  - "${parm}"`);

	ctx.lexer.pushSource(parm.string);

	// const res = parseExpression(ctx);

	ctx.lexer.nextLine();

	const tokens = ctx.lexer.tokens;

	// log("fnEval PARM", `\n${ctx.lexer.dump()}`);

	ctx.lexer.popSource();

	ctx.lexer.insertTokens(tokens);

	// log("fnEval LINE", `\n${ctx.lexer.dump()}`);

	return new TExprStackItem(TOKEN_TYPES.EXPRESSION, null);
}
