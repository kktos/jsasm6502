import type { ScalarToken, Token } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

/** Represents a conditional block state. */
interface ConditionalBlock {
	isTrue: boolean;
	hasPassed: boolean;
}

export class ConditionalDirective implements IDirective {
	private conditionalStack: ConditionalBlock[] = [];

	public handlePassOne(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		this.handleConditional(directive, assembler, context);
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		this.handleConditional(directive, assembler, context);
	}

	/**
	 * Manages conditional assembly state (.IF/.ELSE/.END).
	 * This method is now polymorphic and can be called from either Pass 1 or Pass 2,
	 * as long as it receives the appropriate context.
	 */
	private handleConditional(directive: ScalarToken, assembler: Assembler, context: DirectiveContext): void {
		// Only evaluate if we are not inside a non-assembling block
		const shouldEvaluate = this.conditionalStack.every((block) => block.isTrue);

		const checkCondition = (expressionTokens: Token[]): boolean => {
			try {
				const result = assembler.expressionEvaluator.evaluateAsNumber(expressionTokens, context);
				return result !== 0;
			} catch (e) {
				assembler.logger.warn(`[PASS 1/2] Warning on line ${directive.line}: Failed to evaluate conditional expression. Assuming false. Error: ${e}`);
				return false;
			}
		};

		switch (directive.value) {
			case ".IF": {
				const expressionTokens = assembler.getInstructionTokens();
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
					const expressionTokens = assembler.getInstructionTokens();
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
				// If the .END directive is followed by an identifier 'NAMESPACE', handle namespace pop.
				const next = assembler.peekToken(0);
				if (next && next.type === "IDENTIFIER" && String(next.value).toUpperCase() === "NAMESPACE") {
					// consume the identifier and pop the namespace
					assembler.consume(1);
					try {
						assembler.symbolTable.popNamespace();
						assembler.logger.log(`[PASS] .END NAMESPACE -> popped namespace, current: ${assembler.symbolTable.getCurrentNamespace()}`);
					} catch (e) {
						assembler.logger.error(`Error popping namespace on line ${directive.line}: ${e}`);
					}
				}
				if (this.conditionalStack.length > 0) this.conditionalStack.pop();
				break;
		}
		assembler.isAssembling = this.conditionalStack.every((block) => block.isTrue);
	}
}
