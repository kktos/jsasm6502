import type { Token } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class FillDirective implements IDirective {
	public handlePassOne(assembler: Assembler, context: DirectiveContext): void {
		const startIndex = typeof context.tokenIndex === "number" ? context.tokenIndex : assembler.getPosition();
		const argTokens = assembler.getInstructionTokens();

		const [countTokens] = this.parseArguments(argTokens);

		if (countTokens.length > 0) {
			try {
				const count = assembler.expressionEvaluator.evaluateAsNumber(countTokens, context.evaluationContext);
				assembler.currentPC += count;
			} catch (e) {
				// Error evaluating in pass one, but we must continue. Assume 0 size.
				assembler.logger.warn(`[PASS 1] Warning on line ${context.token.line}: Could not evaluate .FILL count. ${e}`);
			}
		}

		// Advance past the directive line
		assembler.setPosition(startIndex + 1);
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): void {
		const startIndex = typeof context.tokenIndex === "number" ? context.tokenIndex : assembler.getPosition();
		const argTokens = assembler.getInstructionTokens();

		const [countTokens, valueTokens] = this.parseArguments(argTokens);

		const count = assembler.expressionEvaluator.evaluateAsNumber(countTokens, context.evaluationContext);
		const fillerValue = valueTokens.length > 0 ? assembler.expressionEvaluator.evaluateAsNumber(valueTokens, context.evaluationContext) : 0; // Default to 0 if no value is provided

		if (assembler.isAssembling && count > 0) {
			// Ensure filler value is a single byte
			const byteValue = fillerValue & 0xff;
			const bytes = new Array(count).fill(byteValue);
			assembler.outputBuffer.push(...bytes);
		}

		assembler.currentPC += count;

		// Advance past the directive line
		assembler.setPosition(startIndex + 1);
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
