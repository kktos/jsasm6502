import type { Token } from "../lexer/lexer.class";
import { def, undef } from "./def.function";
import { len } from "./len.function";
import { hex } from "./hex.function";
import { split } from "./split.function";
import { array } from "./array.function";
import type { EvaluationStack, IFunctionDef } from "./types";
import type { PASymbolTable } from "../symbol.class";
import { push } from "./push.function";
import { pop } from "./pop.function";
import { type } from "./type.function";
import { json } from "./json.function";
import { iif } from "./iif.function";

const functions = new Map<string, IFunctionDef>();

// Register functions with their argument constraints
functions.set(".LEN", { handler: len, minArgs: 1, maxArgs: 1 });

functions.set(".DEF", { handler: def, minArgs: 1, maxArgs: 1 });
functions.set(".UNDEF", { handler: undef, minArgs: 1, maxArgs: 1 });

functions.set(".HEX", { handler: hex, minArgs: 1, maxArgs: 2 });
functions.set(".SPLIT", { handler: split, minArgs: 1, maxArgs: 2 });

functions.set(".ARRAY", { handler: array, minArgs: 0, maxArgs: Number.POSITIVE_INFINITY });
functions.set(".PUSH", { handler: push, minArgs: 2, maxArgs: Number.POSITIVE_INFINITY });
functions.set(".POP", { handler: pop, minArgs: 1, maxArgs: 1 });

functions.set(".TYPE", { handler: type, minArgs: 1, maxArgs: 1 });
functions.set(".JSON", { handler: json, minArgs: 1, maxArgs: 1 });
functions.set(".IIF", { handler: iif, minArgs: 3, maxArgs: 3 });

export function functionDispatcher(
	name: string,
	stack: EvaluationStack,
	token: Token,
	symbolTable: PASymbolTable,
	argCount: number,
): void {
	const funcDef = functions.get(name.toUpperCase());
	if (!funcDef) {
		throw new Error(`Unknown function '${name}' on line ${token.line}.`);
	}

	// Centralized argument count validation
	if (argCount < funcDef.minArgs || argCount > funcDef.maxArgs) {
		throw new Error(
			`Function '${name}' expects between ${funcDef.minArgs} and ${funcDef.maxArgs} arguments, but got ${argCount} on line ${token.line}.`,
		);
	}

	funcDef.handler(stack, token, symbolTable, argCount);
}
