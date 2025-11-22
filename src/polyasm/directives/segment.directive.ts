import type { ScalarToken } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class SegmentDirective implements IDirective {
	public handlePassOne(_directive: ScalarToken, assembler: Assembler, _context: DirectiveContext) {
		assembler.getInstructionTokens();
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		const tokens = assembler.getInstructionTokens();
		if (tokens.length === 0) throw new Error(`ERROR on line ${directive.line}: .SEGMENT requires a name expression.`);

		const name = assembler.expressionEvaluator.evaluate(tokens, context);
		if (typeof name !== "string") throw new Error(`ERROR on line ${directive.line}: .SEGMENT name must evaluate to a string.`);

		assembler.useSegment(name);
		assembler.logger.log(`[PASS 2] Using segment: ${name}`);
	}
}
