import type { ScalarToken, Token } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class DataDirective implements IDirective {
	private readonly bytesPerElement: number;

	constructor(bytesPerElement: number) {
		this.bytesPerElement = bytesPerElement;
	}

	public handlePassOne(_directive: ScalarToken, assembler: Assembler, _context: DirectiveContext) {
		if (assembler.isAssembling) assembler.currentPC += this.calculateDirectiveSize(assembler);
	}

	public handlePassTwo(_directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		if (assembler.isAssembling) {
			const bytes = this.encodeDataDirective(assembler, context);
			assembler.writeBytes(bytes);
		}
	}

	private calculateDirectiveSize(assembler: Assembler): number {
		if (this.bytesPerElement === 0) {
			// Special case for .TEXT or similar string-only directives
		}

		const argTokens = assembler.getInstructionTokens();
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
		const argTokens = assembler.getInstructionTokens();
		const outputBytes: number[] = [];
		let currentExpression: Token[] = [];

		const evaluateAndPush = () => {
			if (currentExpression.length === 0) return;

			const value = assembler.expressionEvaluator.evaluateAsNumber(currentExpression, context);

			for (let i = 0; i < this.bytesPerElement; i++) outputBytes.push((value >> (i * 8)) & 0xff);

			currentExpression = [];
		};

		for (const token of argTokens) {
			switch (token.type) {
				case "STRING": {
					evaluateAndPush(); // Push any pending expression before the string
					const strValue = token.value;
					for (let i = 0; i < strValue.length; i++) outputBytes.push(strValue.charCodeAt(i));
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
