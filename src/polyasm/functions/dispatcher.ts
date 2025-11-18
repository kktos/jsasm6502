import type { Token } from "../lexer/lexer.class";
import { def } from "./def.function";
import { len } from "./len.function";
import { undef } from "./undef.function";
import { hex } from "./hex.function";
import { split } from "./split.function";
import { array } from "./array.function";
import type { EvaluationStack, IFunction } from "./types";
import type { PASymbolTable } from "../symbol.class";

const functions = new Map<string, IFunction>();
functions.set(".LEN", len);
functions.set(".DEF", def);
functions.set(".UNDEF", undef);
functions.set(".HEX", hex);
functions.set(".SPLIT", split);
functions.set(".ARRAY", array);

export function functionDispatcher(
	name: string,
	stack: EvaluationStack,
	token: Token,
	symbolTable: PASymbolTable,
	argCount: number,
): void {
	const func = functions.get(name.toUpperCase());
	if (!func) {
		throw new Error(`Unknown function '${name}' on line ${token.line}.`);
	}
	func(stack, token, symbolTable, argCount);
}
