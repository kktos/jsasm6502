import type { Assembler } from "../polyasm";
import type { Token } from "../lexer/lexer.class";
import type { EvaluationContext } from "../expression";

/** Defines the context passed to a directive handler. */
export interface DirectiveContext {
	token: Token;
	tokenIndex: number;
	evaluationContext: Omit<EvaluationContext, "symbolTable">;
}

/**
 * Defines the interface for a directive handler.
 * Each directive will have a class that implements this interface.
 */
export interface IDirective {
	/** Handles the processing of the directive during Pass 1. */
	handlePassOne(assembler: Assembler, context: DirectiveContext): number;

	/** Handles the processing of the directive during Pass 2 (code generation). */
	handlePassTwo(assembler: Assembler, context: DirectiveContext): number;
}
