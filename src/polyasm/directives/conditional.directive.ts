import type { Assembler } from "../polyasm";
import type { IDirective } from "./directive.interface";

/** Represents a conditional block state. */
interface ConditionalBlock {
	isTrue: boolean;
	hasPassed: boolean;
}

export class ConditionalDirective implements IDirective {
	private conditionalStack: ConditionalBlock[] = [];

	public handlePassOne(assembler: Assembler, tokenIndex: number): number {
		this.handleConditional(assembler, tokenIndex);
		return assembler.skipToEndOfLine(tokenIndex);
	}

	public handlePassTwo(assembler: Assembler, tokenIndex: number): number {
		this.handleConditional(assembler, tokenIndex);
		return assembler.skipToEndOfLine(tokenIndex);
	}

	/** Manages conditional assembly state (.IF/.ELSE/.END). */
	private handleConditional(assembler: Assembler, index: number): void {
		const token = assembler.activeTokens[index];
		const directive = token.value.toUpperCase();

		// Only evaluate if we are not inside a non-assembling block
		const shouldEvaluate = this.conditionalStack.every((block) => block.isTrue);

		const checkCondition = (startIndex: number): boolean => {
			const expressionTokens = assembler.getInstructionTokens(startIndex);
			if (expressionTokens.length === 0) return false;

			try {
				const streamState = assembler.tokenStreamStack[assembler.tokenStreamStack.length - 1];
				const result = assembler.expressionEvaluator.evaluate(expressionTokens, {
					pc: assembler.currentPC,
					macroArgs: streamState?.macroArgs,
				});
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
				const condition = shouldEvaluate ? checkCondition(index + 1) : false;
				this.conditionalStack.push({ isTrue: condition, hasPassed: condition });
				break;
			}

			case ".ELSEIF": {
				const topIf = this.conditionalStack[this.conditionalStack.length - 1];
				if (!topIf) return;

				if (topIf.hasPassed) {
					topIf.isTrue = false;
				} else {
					const condition = shouldEvaluate ? checkCondition(index + 1) : false;
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
