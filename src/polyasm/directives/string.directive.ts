import type { Assembler } from "../polyasm";
import { ADVANCE_TO_NEXT_LINE, type DirectiveContext, type IDirective } from "./directive.interface";
import type { Token } from "../lexer/lexer.class";

export type StringFormat = "TEXT" | "CSTR" | "PSTR" | "PSTRL";

export class StringDirective implements IDirective {
	private readonly format: StringFormat;

	constructor(format: StringFormat) {
		this.format = format;
	}

	public handlePassOne(assembler: Assembler, context: DirectiveContext): number {
		assembler.currentPC += this.calculateSize(assembler, context);
		return ADVANCE_TO_NEXT_LINE;
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): number {
		if (assembler.isAssembling) {
			const bytes = this.encodeData(assembler, context);
			assembler.outputBuffer.push(...bytes);
			assembler.currentPC += bytes.length;
		} else {
			// If not assembling, just advance PC
			assembler.currentPC += this.calculateSize(assembler, context);
		}

		return ADVANCE_TO_NEXT_LINE;
	}

	private getStrings(assembler: Assembler, context: DirectiveContext): string[] {
		const argTokens = assembler.getInstructionTokens(context.tokenIndex + 1);
		const strings: string[] = [];
		let currentExpression: Token[] = [];

		const evaluateAndPush = () => {
			if (currentExpression.length === 0) return;

			const value = assembler.expressionEvaluator.evaluate(currentExpression, context.evaluationContext);
			if (typeof value !== "string") {
				throw new Error(`Data directive expression must evaluate to a string on line ${context.token.line}.`);
			}
			strings.push(value);
			currentExpression = [];
		};

		for (const token of argTokens) {
			if (token.type === "COMMA") {
				evaluateAndPush();
			} else {
				currentExpression.push(token);
			}
		}
		evaluateAndPush(); // Push the last expression
		return strings;
	}

	private calculateSize(assembler: Assembler, context: DirectiveContext): number {
		const strings = this.getStrings(assembler, {
			...context,
			evaluationContext: { ...context.evaluationContext, allowForwardRef: true },
		});
		let totalSize = 0;
		for (const str of strings) {
			totalSize += str.length;
			switch (this.format) {
				case "CSTR":
					totalSize += 1;
					break;
				case "PSTR":
					totalSize += 1;
					break;
				case "PSTRL":
					totalSize += 2;
					break;
			}
		}
		return totalSize;
	}

	private encodeData(assembler: Assembler, context: DirectiveContext): number[] {
		const strings = this.getStrings(assembler, context);
		const outputBytes: number[] = [];

		for (const str of strings) {
			const chars = str.split("").map((c) => c.charCodeAt(0));

			switch (this.format) {
				case "TEXT":
					outputBytes.push(...chars);
					break;
				case "CSTR":
					outputBytes.push(...chars, 0);
					break;
				case "PSTR":
					if (str.length > 255)
						throw new Error(`.PSTR string length cannot exceed 255 bytes on line ${context.token.line}.`);
					outputBytes.push(str.length, ...chars);
					break;
				case "PSTRL":
					if (str.length > 65535)
						throw new Error(`.PSTRL string length cannot exceed 65535 bytes on line ${context.token.line}.`);
					outputBytes.push(str.length & 0xff, (str.length >> 8) & 0xff, ...chars); // Little-endian length
					break;
			}
		}
		return outputBytes;
	}
}
