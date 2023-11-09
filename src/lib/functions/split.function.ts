import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
import { TValueType } from "../types/Value.type";

export function fnSplit(ctx: Context, parms: TValueType[]) {
	const str = parms[0];
	if (typeof str !== "string")
		throw new VAParseError(`SPLIT: First parameter should be a string  - "${str}":${typeof str}`);

	const splitOn = parms.length > 1 ? parms[1] : " ";
	if (typeof splitOn !== "string")
		throw new VAParseError(`SPLIT: Second parameter should be a string  - "${splitOn}":${typeof splitOn}`);

	const value = str.split(splitOn);
	return TExprStackItem.newArray(value);
}
