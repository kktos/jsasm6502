import type { Token } from "../lexer/lexer.class";
import { len } from "./len";
import type { EvaluationStack, IFunction } from "./types";

const functions = new Map<string, IFunction>();
functions.set(".LEN", len);

export function functionDispatcher(name: string, stack: EvaluationStack, token: Token): void {
	const func = functions.get(name.toUpperCase());
	if (!func) {
		throw new Error(`Unknown function '${name}' on line ${token.line}.`);
	}
	func(stack, token);
}
