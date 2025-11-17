import * as console from "console";
import { IDirective, DirectiveContext, ADVANCE_TO_NEXT_LINE } from "./directive.interface";
import { Assembler } from "../polyasm";

export class OptionDirective implements IDirective {
	public handlePassOne(assembler: Assembler, context: DirectiveContext): number {
		this.setOption(assembler, context);
		return assembler.skipToEndOfLine(context.tokenIndex);
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): number {
		// this.setOption(assembler, context);
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
