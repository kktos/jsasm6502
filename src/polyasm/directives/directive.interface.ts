import type { Assembler } from "../polyasm";

/**
 * Defines the interface for a directive handler.
 * Each directive will have a class that implements this interface.
 */
export interface IDirective {
	/**
	 * Handles the processing of the directive during Pass 1.
	 * @returns The new token index to continue from.
	 */
	handlePassOne(assembler: Assembler, tokenIndex: number): number;

	/**
	 * Handles the processing of the directive during Pass 2 (code generation).
	 * @returns The new token index to continue from.
	 */
	handlePassTwo(assembler: Assembler, tokenIndex: number): number;
}
