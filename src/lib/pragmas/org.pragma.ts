import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { parseExpression } from "../parsers/expression/expression.parser";

export function processOrg(ctx: Context) {
	const res = parseExpression(ctx);
	if (!res || res.type !== TOKEN_TYPES.NUMBER) throw new VAParseError("ORG: Need an address");
	ctx.code.setPC(res.value as number);
	return true;
}
