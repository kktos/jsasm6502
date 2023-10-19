import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { parseExpression } from "./expression.parser";

export function parseOrg(ctx: Context) {
	ctx.lexer.next();

	if (!ctx.lexer.isToken(TOKEN_TYPES.EQUAL)) throw new VAParseError("ORG: Syntax Error");

	ctx.lexer.next();

	const res = parseExpression(ctx);
	if (!res || res.type !== TOKEN_TYPES.NUMBER) throw new VAParseError("ORG: Need an address");

	ctx.code.setPC(res.value as number);
}
