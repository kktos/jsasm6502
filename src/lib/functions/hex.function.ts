import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

// .hex( <numberToDisplayAsHexString> [ , <minNumberOfDigitsOnTheOutputString> ] )
export function fnHex(_ctx: Context, parms: (TExprStackItem | undefined)[]) {
	const parm = parms[0];
	if (!parm || parm.type !== TOKEN_TYPES.NUMBER) throw new VAParseError(`HEX: Parameter should be a number  - "${parm}"`);

	if (parms.length > 1 && parms[1]?.type !== TOKEN_TYPES.NUMBER) throw new VAParseError(`HEX: Second parameter should be a number  - "${parms[1]}"`);

	const num = parm.number;
	const numberOfDigits = parms[1] ? parms[1].number : num > 0xff ? 4 : 2;

	const hexStr = num.toString(16).toUpperCase();
	return TExprStackItem.newString(`$${numberOfDigits ? hexStr.padStart(numberOfDigits, "0") : hexStr}`);
}
