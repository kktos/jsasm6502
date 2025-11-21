import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";
import type { ScalarToken, Token } from "../lexer/lexer.class";

export class AlignDirective implements IDirective {
	public handlePassOne(directive: ScalarToken, assembler: Assembler, context: DirectiveContext): void {
		// const startIndex = typeof context.tokenIndex === "number" ? context.tokenIndex : assembler.getPosition();
		const startIndex = assembler.getPosition();
		const alignExpressionTokens = assembler.getInstructionTokens();
		const [boundaryTokens] = this.parseArguments(alignExpressionTokens);

		try {
			const boundary = assembler.expressionEvaluator.evaluateAsNumber(boundaryTokens, context);
			if (boundary <= 0) {
				assembler.setPosition(startIndex + 1);
				return;
			}

			// Check if boundary is a power of two, which is a common requirement.
			if ((boundary & (boundary - 1)) !== 0) {
				assembler.logger.warn(`[PASS 1] Warning on line ${directive.line}: .ALIGN boundary ${boundary} is not a power of two.`);
			}

			const newPC = (assembler.currentPC + boundary - 1) & ~(boundary - 1);
			assembler.currentPC = newPC;
		} catch (e) {
			assembler.logger.warn(`[PASS 1] Warning on line ${directive.line}: Could not evaluate .ALIGN expression. ${e}`);
		}

		// Advance past the directive line
		assembler.setPosition(startIndex + 1);
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, context: DirectiveContext): void {
		// const startIndex = typeof context.tokenIndex === "number" ? context.tokenIndex : assembler.getPosition();
		const startIndex = assembler.getPosition();
		const alignExpressionTokens = assembler.getInstructionTokens();
		const [boundaryTokens, valueTokens] = this.parseArguments(alignExpressionTokens);

		try {
			const boundary = assembler.expressionEvaluator.evaluateAsNumber(boundaryTokens, context);
			if (boundary <= 0) {
				assembler.setPosition(startIndex + 1);
				return;
			}

			const fillerValue = valueTokens.length > 0 ? assembler.expressionEvaluator.evaluateAsNumber(valueTokens, context) : 0; // Default to 0 if no value is provided

			const newPC = (assembler.currentPC + boundary - 1) & ~(boundary - 1);
			const paddingBytes = newPC - assembler.currentPC;

			if (assembler.isAssembling && paddingBytes > 0) {
				// Ensure filler value is a single byte
				const filler = fillerValue & 0xff;
				const bytes = new Array(paddingBytes).fill(filler);
				assembler.outputBuffer.push(...bytes);
			}

			assembler.currentPC = newPC;
		} catch (e) {
			assembler.logger.error(`ERROR on line ${directive.line}: Failed to evaluate .ALIGN expression. ${e}`);
		}

		// Advance past the directive line
		assembler.setPosition(startIndex + 1);
	}

	/**
	 * Parses the argument tokens into boundary and value expressions.
	 * @returns A tuple containing [boundaryTokens, valueTokens].
	 */
	private parseArguments(tokens: Token[]): [Token[], Token[]] {
		const commaIndex = tokens.findIndex((t) => t.type === "COMMA");

		if (commaIndex === -1) {
			// No comma, all tokens are for the boundary.
			return [tokens, []];
		}

		const boundaryTokens = tokens.slice(0, commaIndex);
		const valueTokens = tokens.slice(commaIndex + 1);
		return [boundaryTokens, valueTokens];
	}
}
