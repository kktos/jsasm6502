import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

export function fnSplit(ctx: Context, parms: (TExprStackItem | undefined)[]) {
	const str = parms[0];
	if (str?.type !== TOKEN_TYPES.STRING) throw new VAParseError(`SPLIT: First parameter should be a string  - "${str}"`);

	if (parms.length > 1 && parms[1]?.type !== TOKEN_TYPES.STRING)
		throw new VAParseError(`SPLIT: Second parameter should be a string  - "${parms[1]}"`);

	const splitOn = parms.length > 1 && parms[1] ? parms[1].string : " ";
	const value = str.string.split(splitOn);
	return TExprStackItem.newArray(value.map((str) => TExprStackItem.newString(str)));
}
