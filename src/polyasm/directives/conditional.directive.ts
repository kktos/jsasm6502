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
		const checkCondition = (expressionTokens: Token[]): boolean => {
			try {
				const result = assembler.expressionEvaluator.evaluateAsNumber(expressionTokens, context);
				return result !== 0;
			} catch (e) {
				throw `Error on line ${directive.line}: Failed to evaluate conditional expression. ${e}`;
			}
		};

		switch (directive.value) {
			case "IF": {
				const parentIsTrue = this.conditionalStack.every((block) => block.isTrue);
				const expressionTokens = assembler.getInstructionTokens(directive);
				const isTrue = parentIsTrue ? checkCondition(expressionTokens) : false;

				this.conditionalStack.push({ isTrue, hasPassed: isTrue });

				if (!isTrue) this.skipToNextConditionalBoundary(assembler);

				break;
			}

			case "ELSEIF": {
				const topIf = this.conditionalStack[this.conditionalStack.length - 1];
				if (!topIf) throw new Error(`.ELSEIF without .IF on line ${directive.line}`);

				if (topIf.hasPassed) {
					topIf.isTrue = false;
					this.skipToNextConditionalBoundary(assembler);
				} else {
					const parentIsTrue = this.conditionalStack.slice(0, -1).every((block) => block.isTrue);
					const expressionTokens = assembler.getInstructionTokens(directive);
					const isTrue = parentIsTrue ? checkCondition(expressionTokens) : false;

					topIf.isTrue = isTrue;
					if (isTrue) topIf.hasPassed = true;
					else this.skipToNextConditionalBoundary(assembler);
				}
				break;
			}

			case "ELSE": {
				const topIf = this.conditionalStack[this.conditionalStack.length - 1];
				if (!topIf) throw new Error(`.ELSE without .IF on line ${directive.line}`);

				if (topIf.hasPassed) {
					topIf.isTrue = false;
					assembler.skipToDirectiveEnd("IF");
					this.conditionalStack.pop();
				} else {
					topIf.isTrue = true;
					topIf.hasPassed = true;
				}
				break;
			}

			case "END": {
				const next = assembler.peekToken(0);
				if (next && next.type === "IDENTIFIER" && String(next.value).toUpperCase() === "NAMESPACE") {
					assembler.consume(1);
					try {
						assembler.symbolTable.popNamespace();
					} catch (e) {
						assembler.logger.error(`Error popping namespace on line ${directive.line}: ${e}`);
					}
				}
				if (this.conditionalStack.length > 0) {
					// const topIf = this.conditionalStack[this.conditionalStack.length - 1];
					// If we are ending a block where no branch was taken, but there was an .ELSE,
					// the final state of topIf.isTrue might be true, but we were skipping.
					// The pop correctly restores the parent state.
					this.conditionalStack.pop();
				}
				break;
			}
		}
	}

	private skipToNextConditionalBoundary(assembler: Assembler): void {
		let depth = 0;

		while (true) {
			const token = assembler.peekToken(0);
			if (!token || token.type === "EOF") break;

			if (token.type === "DOT") {
				const nextToken = assembler.peekToken(1);
				if (nextToken?.type === "IDENTIFIER") {
					const directiveName = nextToken.value;

					if (directiveName === "IF") {
						depth++;
					} else if (directiveName === "END") {
						if (depth === 0) {
							return; // Stop before .END
						}
						depth--;
					} else if (depth === 0 && (directiveName === "ELSE" || directiveName === "ELSEIF")) {
						return; // Stop before .ELSE or .ELSEIF
					}
				}
			}
			assembler.consume(1);
		}
	}
}
