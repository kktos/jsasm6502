import type { Assembler } from "../polyasm";
import { ADVANCE_TO_NEXT_LINE, type DirectiveContext, type IDirective } from "./directive.interface";

export class OrgDirective implements IDirective {
	public handlePassOne(assembler: Assembler, context: DirectiveContext): number {
		const { token, tokenIndex, evaluationContext } = context;
		const orgExpressionTokens = assembler.getInstructionTokens(tokenIndex + 1);

		try {
			assembler.currentPC = assembler.expressionEvaluator.evaluateAsNumber(orgExpressionTokens, evaluationContext);
		} catch (e) {
			console.warn(
				`[PASS 1] Warning on line ${token.line}: Failed to evaluate .ORG expression. Assuming 0x0000. Error: ${e}`,
			);
			assembler.currentPC = 0x0000;
		}

		return assembler.skipToEndOfLine(tokenIndex);
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): number {
		const orgExpressionTokens = assembler.getInstructionTokens(context.tokenIndex + 1);
		try {
			assembler.currentPC = assembler.expressionEvaluator.evaluateAsNumber(orgExpressionTokens, context.evaluationContext);
		} catch (e) {
			console.error(`ERROR on line ${context.token.line}: Failed to evaluate .ORG expression. ${e}`);
		}

		// The main loop handles index advancement for directives
		return ADVANCE_TO_NEXT_LINE;
	}
}
