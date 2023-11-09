import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
import { TValueType } from "../types/Value.type";

const log = console.log;

export function fnEval(ctx: Context, parms: TValueType[]) {
	const parm = parms[0];
	if (typeof parm !== "string") throw new VAParseError(`EVAL: Invalid Parameter Type ${typeof parm}`);

	ctx.lexer.pushSource(parm);

	// const res = parseExpression(ctx);

	ctx.lexer.nextLine();

	const tokens = ctx.lexer.tokens;

	log("fnEval PARM", `\n${ctx.lexer.dump()}`);

	ctx.lexer.popSource();

	ctx.lexer.insertTokens(tokens);

	log("fnEval LINE", `\n${ctx.lexer.dump()}`);

	return new TExprStackItem(TOKEN_TYPES.EXPRESSION, null);
}
