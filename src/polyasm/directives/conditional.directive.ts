import type { Token } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import { ADVANCE_TO_NEXT_LINE, type DirectiveContext, type IDirective } from "./directive.interface";

/** Represents a conditional block state. */
interface ConditionalBlock {
	isTrue: boolean;
	hasPassed: boolean;
}

export class ConditionalDirective implements IDirective {
	private conditionalStack: ConditionalBlock[] = [];

	public handlePassOne(assembler: Assembler, context: DirectiveContext): number {
		this.handleConditional(assembler, context);
		return assembler.skipToEndOfLine(context.tokenIndex);
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): number {
		this.handleConditional(assembler, context);
		return ADVANCE_TO_NEXT_LINE;
	}

	/**
	 * Manages conditional assembly state (.IF/.ELSE/.END).
	 * This method is now polymorphic and can be called from either Pass 1 or Pass 2,
	 * as long as it receives the appropriate context.
	 */
	private handleConditional(assembler: Assembler, context: DirectiveContext): void {
		const { token, tokenIndex, evaluationContext } = context;
		const directive = token.value.toUpperCase();

		// Only evaluate if we are not inside a non-assembling block
		const shouldEvaluate = this.conditionalStack.every((block) => block.isTrue);

		const checkCondition = (expressionTokens: Token[]): boolean => {
			try {
				const result = assembler.expressionEvaluator.evaluateAsNumber(expressionTokens, evaluationContext);
				return result !== 0;
			} catch (e) {
				console.warn(
					`[PASS 1/2] Warning on line ${token.line}: Failed to evaluate conditional expression. Assuming false. Error: ${e}`,
				);
				return false;
			}
		};

		switch (directive) {
			case ".IF": {
				const expressionTokens = assembler.getInstructionTokens(tokenIndex + 1);
				const condition = shouldEvaluate ? checkCondition(expressionTokens) : false;
				this.conditionalStack.push({ isTrue: condition, hasPassed: condition });
				break;
			}

			case ".ELSEIF": {
				const topIf = this.conditionalStack[this.conditionalStack.length - 1];
				if (!topIf) return;

				if (topIf.hasPassed) {
					topIf.isTrue = false;
				} else {
					const expressionTokens = assembler.getInstructionTokens(tokenIndex + 1);
					const condition = shouldEvaluate ? checkCondition(expressionTokens) : false;
					topIf.isTrue = condition;
					topIf.hasPassed = condition;
				}
				break;
			}

			case ".ELSE": {
				const topElse = this.conditionalStack[this.conditionalStack.length - 1];
				if (!topElse) return;
				topElse.isTrue = !topElse.hasPassed;
				topElse.hasPassed = true;
				break;
			}

			case ".END":
				if (this.conditionalStack.length > 0) this.conditionalStack.pop();
				break;
		}
		assembler.isAssembling = this.conditionalStack.every((block) => block.isTrue);
	}
}
