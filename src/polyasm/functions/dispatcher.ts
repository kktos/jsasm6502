import type { Token } from "../lexer/lexer.class";
import { def, undef } from "./def.function";
import { len } from "./len.function";
import { hex } from "./hex.function";
import { split } from "./split.function";
import { array } from "./array.function";
import type { EvaluationStack, IFunction } from "./types";
import type { PASymbolTable } from "../symbol.class";
import { push } from "./push.function";
import { pop } from "./pop.function";

const functions = new Map<string, IFunction>();

functions.set(".LEN", len);

functions.set(".DEF", def);
functions.set(".UNDEF", undef);

functions.set(".HEX", hex);
functions.set(".SPLIT", split);

functions.set(".ARRAY", array);
functions.set(".PUSH", push);
functions.set(".POP", pop);

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
