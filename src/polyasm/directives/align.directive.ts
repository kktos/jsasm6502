import type { Assembler } from "../polyasm";
import { ADVANCE_TO_NEXT_LINE, type DirectiveContext, type IDirective } from "./directive.interface";
import type { Token } from "../lexer/lexer.class";

export class AlignDirective implements IDirective {
	public handlePassOne(assembler: Assembler, context: DirectiveContext): number {
		const { token, tokenIndex, evaluationContext } = context;
		const alignExpressionTokens = assembler.getInstructionTokens(tokenIndex + 1);
		const [boundaryTokens] = this.parseArguments(alignExpressionTokens);

		try {
			const boundary = assembler.expressionEvaluator.evaluateAsNumber(boundaryTokens, evaluationContext);
			if (boundary <= 0) return assembler.skipToEndOfLine(tokenIndex);

			// Check if boundary is a power of two, which is a common requirement.
			if ((boundary & (boundary - 1)) !== 0) {
				console.warn(`[PASS 1] Warning on line ${token.line}: .ALIGN boundary ${boundary} is not a power of two.`);
			}

			const newPC = (assembler.currentPC + boundary - 1) & ~(boundary - 1);
			assembler.currentPC = newPC;
		} catch (e) {
			console.warn(`[PASS 1] Warning on line ${token.line}: Could not evaluate .ALIGN expression. ${e}`);
		}

		return assembler.skipToEndOfLine(tokenIndex);
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): number {
		const { token, tokenIndex, evaluationContext } = context;
		const alignExpressionTokens = assembler.getInstructionTokens(tokenIndex + 1);
		const [boundaryTokens, valueTokens] = this.parseArguments(alignExpressionTokens);

		try {
			const boundary = assembler.expressionEvaluator.evaluateAsNumber(boundaryTokens, evaluationContext);
			if (boundary <= 0) return ADVANCE_TO_NEXT_LINE;

			const fillerValue =
				valueTokens.length > 0 ? assembler.expressionEvaluator.evaluateAsNumber(valueTokens, evaluationContext) : 0; // Default to 0 if no value is provided

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
			console.error(`ERROR on line ${token.line}: Failed to evaluate .ALIGN expression. ${e}`);
		}

		return ADVANCE_TO_NEXT_LINE;
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
