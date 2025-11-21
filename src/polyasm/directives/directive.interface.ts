import type { Assembler } from "../polyasm";
import type { EvaluationContext } from "../expression";
import type { ScalarToken } from "../lexer/lexer.class";

/** A special return value for directive handlers to signal default "next line" behavior. */
export const ADVANCE_TO_NEXT_LINE = -1;

/** Defines the context passed to a directive handler. */
// export interface DirectiveContext {
// token: Token;
/** Optional: absolute token index of the directive in the active stream. May be omitted when using relative/streaming handlers. */
// tokenIndex?: number;
// 	evaluationContext: Omit<EvaluationContext, "symbolTable">;
// }
export type DirectiveContext = Omit<EvaluationContext, "symbolTable">;

/**
 * Defines the interface for a directive handler.
 * Each directive will have a class that implements this interface.
 */
export interface IDirective {
	/** Handles the processing of the directive during Pass 1. */
	/**
	 * Handles the processing of the directive during Pass 1.
	 *
	 * Return values:
	 * - `number`: legacy absolute-index to continue from (keeps backward compatibility)
	 * - `ADVANCE_TO_NEXT_LINE`: request default "advance to next line" behavior
	 * - `void` / `undefined`: handler managed the assembler position itself (streaming-friendly)
	 */
	handlePassOne(directive: ScalarToken, assembler: Assembler, context: DirectiveContext): void;

	/**
	 * Handles the processing of the directive during Pass 2 (code generation).
	 * See `handlePassOne` for allowed return conventions.
	 */
	handlePassTwo(directive: ScalarToken, assembler: Assembler, context: DirectiveContext): void;
}
