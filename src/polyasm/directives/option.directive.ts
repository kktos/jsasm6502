import * as console from "node:console";
import { type IDirective, type DirectiveContext, ADVANCE_TO_NEXT_LINE } from "./directive.interface";
import type { Assembler } from "../polyasm";

export class OptionDirective implements IDirective {
	public handlePassOne(assembler: Assembler, context: DirectiveContext): number {
		this.setOption(assembler, context);
		return ADVANCE_TO_NEXT_LINE;
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): number {
		// Options are handled in Pass 1 (or a pre-pass for lexer options).
		// This is a no-op in Pass 2.
		return ADVANCE_TO_NEXT_LINE;
	}

	private setOption(assembler: Assembler, context: DirectiveContext): void {
		const { token, tokenIndex, evaluationContext } = context;
		const argTokens = assembler.getInstructionTokens(tokenIndex + 1);

		if (argTokens.length < 2) {
			throw new Error(`Invalid .OPTION syntax on line ${token.line}. Expected: .OPTION <name> <value>`);
		}

		const optionName = argTokens[0].value.toLowerCase();
		const optionValue = assembler.expressionEvaluator.evaluate(argTokens.slice(1), evaluationContext);

		switch (optionName) {
			case "local_label_style":
				if (typeof optionValue !== "string" || optionValue.length !== 1) {
					throw new Error(`Value for 'local_label_style' must be a single character string on line ${token.line}.`);
				}
				assembler.options.set("local_label_style", optionValue);
				console.log(`[OPTION] Set local label character to: '${optionValue}'`);
				break;
			default:
				console.warn(`[OPTION] Unknown option '${optionName}' on line ${token.line}.`);
		}
	}
}
