import type { Token } from "./lexer/lexer.class";
import type { PASymbolTable, SymbolValue } from "./symbol.class";

/** Minimal context shape required by sysvar resolver. Avoid importing EvaluationContext to prevent circular imports. */
export interface SysVarContext {
	pc: number;
	symbolTable: PASymbolTable;
	pass: number;
}

/**
 * Resolve system variables used in expressions.
 * Supported sysvars:
 * - .NAMESPACE / .NS -> returns the current namespace as a string (or empty string if none)
 * - .PC -> returns the current program counter as a number
 */
export function resolveSysVar(token: Token, context: SysVarContext): SymbolValue {
	const name = String(token.value).toUpperCase();

	switch (name) {
		case "NAMESPACE":
		case "NS":
			return context.symbolTable.getCurrentNamespace();

		case "PC":
			return context.pc;

		case "PASS":
			return context.pass;

		default:
			throw new Error(`Unknown system variable: ${name} on line ${token.line}.`);
	}
}
