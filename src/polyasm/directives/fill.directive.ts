import type { Assembler } from "../polyasm";
import { ADVANCE_TO_NEXT_LINE, type DirectiveContext, type IDirective } from "./directive.interface";
import type { Token } from "../lexer/lexer.class";

export class FillDirective implements IDirective {
	public handlePassOne(assembler: Assembler, context: DirectiveContext): number {
		const { tokenIndex, evaluationContext } = context;
		const argTokens = assembler.getInstructionTokens(tokenIndex + 1);

		const [countTokens] = this.parseArguments(argTokens);

		if (countTokens.length > 0) {
			try {
				const count = assembler.expressionEvaluator.evaluateAsNumber(countTokens, evaluationContext);
				assembler.currentPC += count;
			} catch (e) {
				// Error evaluating in pass one, but we must continue. Assume 0 size.
				console.warn(`[PASS 1] Warning on line ${context.token.line}: Could not evaluate .FILL count. ${e}`);
			}
		}

		return assembler.skipToEndOfLine(tokenIndex);
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): number {
		const { tokenIndex, evaluationContext } = context;
		const argTokens = assembler.getInstructionTokens(tokenIndex + 1);

		const [countTokens, valueTokens] = this.parseArguments(argTokens);

		const count = assembler.expressionEvaluator.evaluateAsNumber(countTokens, evaluationContext);
		const fillerValue =
			valueTokens.length > 0 ? assembler.expressionEvaluator.evaluateAsNumber(valueTokens, evaluationContext) : 0; // Default to 0 if no value is provided

		if (assembler.isAssembling && count > 0) {
			// Ensure filler value is a single byte
			const byteValue = fillerValue & 0xff;
			const bytes = new Array(count).fill(byteValue);
			assembler.outputBuffer.push(...bytes);
		}

		assembler.currentPC += count;

		return ADVANCE_TO_NEXT_LINE;
	}

	/**
	 * Parses the argument tokens into count and value expressions.
	 * @returns A tuple containing [countTokens, valueTokens].
	 */
	private parseArguments(tokens: Token[]): [Token[], Token[]] {
		const commaIndex = tokens.findIndex((t) => t.type === "COMMA");

		if (commaIndex === -1) {
			// No comma, all tokens are for the count.
			return [tokens, []];
		}

		const countTokens = tokens.slice(0, commaIndex);
		const valueTokens = tokens.slice(commaIndex + 1);
		return [countTokens, valueTokens];
	}
}
