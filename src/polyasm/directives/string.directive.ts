import type { ScalarToken, Token } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

export type StringFormat = "TEXT" | "CSTR" | "PSTR" | "PSTRL";

export class StringDirective implements IDirective {
	private readonly format: StringFormat;

	constructor(format: StringFormat) {
		this.format = format;
	}

	public handlePassOne(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		assembler.currentPC += this.calculateSize(directive, assembler, context);
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		if (assembler.isAssembling) {
			const bytes = this.encodeData(directive, assembler, context);
			assembler.outputBuffer.push(...bytes);
			assembler.currentPC += bytes.length;
		} else {
			// If not assembling, just advance PC
			assembler.currentPC += this.calculateSize(directive, assembler, context);
		}
	}

	private getStrings(directive: ScalarToken, assembler: Assembler, context: DirectiveContext): string[] {
		// const startIndex = typeof context.tokenIndex === "number" ? context.tokenIndex : assembler.getPosition();
		const argTokens = assembler.getInstructionTokens();
		const strings: string[] = [];
		let currentExpression: Token[] = [];

		const evaluateAndPush = () => {
			if (currentExpression.length === 0) return;

			const value = assembler.expressionEvaluator.evaluate(currentExpression, context);
			if (typeof value !== "string") throw new Error(`Data directive expression must evaluate to a string on line ${directive.line}.`);

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
		evaluateAndPush();
		return strings;
	}

	private calculateSize(directive: ScalarToken, assembler: Assembler, context: DirectiveContext): number {
		const strings = this.getStrings(directive, assembler, {
			...context,
			allowForwardRef: true,
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

	private encodeData(directive: ScalarToken, assembler: Assembler, context: DirectiveContext): number[] {
		const strings = this.getStrings(directive, assembler, context);
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
					if (str.length > 255) throw new Error(`.PSTR string length cannot exceed 255 bytes on line ${directive.line}.`);
					outputBytes.push(str.length, ...chars);
					break;
				case "PSTRL":
					if (str.length > 65535) throw new Error(`.PSTRL string length cannot exceed 65535 bytes on line ${directive.line}.`);
					outputBytes.push(str.length & 0xff, (str.length >> 8) & 0xff, ...chars); // Little-endian length
					break;
			}
		}
		return outputBytes;
	}
}
