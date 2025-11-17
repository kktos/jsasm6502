import type { Assembler } from "../polyasm";
import { ADVANCE_TO_NEXT_LINE, type DirectiveContext, type IDirective } from "./directive.interface";
import type { Token } from "../lexer/lexer.class";

export class DataDirective implements IDirective {
	private readonly bytesPerElement: number;

	constructor(bytesPerElement: number) {
		this.bytesPerElement = bytesPerElement;
	}

	public handlePassOne(assembler: Assembler, context: DirectiveContext): number {
		assembler.currentPC += this.calculateDirectiveSize(assembler, context.tokenIndex);
		return ADVANCE_TO_NEXT_LINE;
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): number {
		if (assembler.isAssembling) {
			const bytes = this.encodeDataDirective(assembler, context);
			assembler.outputBuffer.push(...bytes);
			assembler.currentPC += bytes.length;
		} else {
			// If not assembling (e.g., inside a false .IF block), just calculate size to advance PC
			assembler.currentPC += this.calculateDirectiveSize(assembler, context.tokenIndex);
		}

		return ADVANCE_TO_NEXT_LINE;
	}

	private calculateDirectiveSize(assembler: Assembler, tokenIndex: number): number {
		if (this.bytesPerElement === 0) {
			// Special case for .TEXT or similar string-only directives
		}

		const argTokens = assembler.getInstructionTokens(tokenIndex + 1);
		if (argTokens.length === 0) return 0;

		let totalSize = 0;
		let isElement = false;

		for (const token of argTokens) {
			switch (token.type) {
				case "STRING":
					totalSize += token.value.length;
					isElement = true;
					break;
				case "COMMA":
					// Comma resets the flag, so the next non-comma token starts a new element
					isElement = false;
					break;
				default:
					if (!isElement) {
						// This is the start of a new numeric element
						totalSize += this.bytesPerElement;
						isElement = true;
					}
					break;
			}
		}

		return totalSize;
	}

	private encodeDataDirective(assembler: Assembler, context: DirectiveContext): number[] {
		const argTokens = assembler.getInstructionTokens(context.tokenIndex + 1);
		const outputBytes: number[] = [];
		let currentExpression: Token[] = [];

		const evaluateAndPush = () => {
			if (currentExpression.length === 0) return;

			const value = assembler.expressionEvaluator.evaluateAsNumber(currentExpression, context.evaluationContext);
			// This check is now redundant due to evaluateAsNumber, but good for safety
			if (typeof value !== "number") throw new Error("Data directive expression must evaluate to a number.");
			for (let i = 0; i < this.bytesPerElement; i++) {
				outputBytes.push((value >> (i * 8)) & 0xff);
			}
			currentExpression = [];
		};

		for (const token of argTokens) {
			switch (token.type) {
				case "STRING": {
					evaluateAndPush(); // Push any pending expression before the string
					const strValue = token.value;
					for (let i = 0; i < strValue.length; i++) {
						outputBytes.push(strValue.charCodeAt(i));
					}
					break;
				}
				case "COMMA":
					evaluateAndPush(); // Evaluate and push the expression before the comma
					break;
				default:
					currentExpression.push(token);
			}
		}

		evaluateAndPush(); // Push the last expression

		return outputBytes;
	}
}
