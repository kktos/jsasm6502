import type { ScalarToken } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class OrgDirective implements IDirective {
	public handlePassOne(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		const orgExpressionTokens = assembler.parser.getInstructionTokens();

		try {
			assembler.currentPC = assembler.expressionEvaluator.evaluateAsNumber(orgExpressionTokens, context);
		} catch (e) {
			assembler.logger.warn(`[PASS 1] Warning on line ${directive.line}: Failed to evaluate .ORG expression. Assuming 0x0000. Error: ${e}`);
			assembler.currentPC = 0x0000;
		}
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		const orgExpressionTokens = assembler.parser.getInstructionTokens();
		try {
			assembler.currentPC = assembler.expressionEvaluator.evaluateAsNumber(orgExpressionTokens, context);
		} catch (e) {
			assembler.logger.error(`ERROR on line ${directive.line}: Failed to evaluate .ORG expression. ${e}`);
		}
	}
}
