import type { Token } from "../lexer/lexer.class";
import { def } from "./def";
import { len } from "./len";
import { undef } from "./undef";
import { hex } from "./hex";
import type { EvaluationStack, IFunction } from "./types";
import type { PASymbolTable } from "../symbol.class";

const functions = new Map<string, IFunction>();
functions.set(".LEN", len);
functions.set(".DEF", def);
functions.set(".UNDEF", undef);
functions.set(".HEX", hex);

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
