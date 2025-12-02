import type { ScalarToken, Token } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class FillDirective implements IDirective {
	public handlePassOne(directive: ScalarToken, assembler: Assembler, context: DirectiveContext): void {
		const argTokens = assembler.parser.getInstructionTokens();

		const [countTokens] = this.parseArguments(argTokens);

		if (countTokens.length > 0) {
			try {
				const count = assembler.expressionEvaluator.evaluateAsNumber(countTokens, context);
				assembler.currentPC += count;
			} catch (e) {
				// Error evaluating in pass one, but we must continue. Assume 0 size.
				assembler.logger.warn(`[PASS 1] Warning on line ${directive.line}: Could not evaluate .FILL count. ${e}`);
			}
		}
	}

	public handlePassTwo(_directive: ScalarToken, assembler: Assembler, context: DirectiveContext): void {
		const argTokens = assembler.parser.getInstructionTokens();

		const [countTokens, valueTokens] = this.parseArguments(argTokens);

		const count = assembler.expressionEvaluator.evaluateAsNumber(countTokens, context);
		const fillerValue = valueTokens.length > 0 ? assembler.expressionEvaluator.evaluateAsNumber(valueTokens, context) : 0; // Default to 0 if no value is provided

		if (assembler.isAssembling && count > 0) {
			// Ensure filler value is a single byte
			const byteValue = fillerValue & 0xff;
			const bytes = new Array(count).fill(byteValue);
			assembler.writeBytes(bytes);
		}

		// Advance PC if not assembling; writeBytes already advances PC when assembling
		if (!assembler.isAssembling) assembler.currentPC += count;
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
