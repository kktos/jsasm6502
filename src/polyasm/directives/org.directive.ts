import type { Assembler } from "../polyasm";
import type { IDirective } from "./directive.interface";

export class OrgDirective implements IDirective {
	public handlePassOne(assembler: Assembler, tokenIndex: number): number {
		const token = assembler.activeTokens[tokenIndex];
		const orgExpressionTokens = assembler.getInstructionTokens(tokenIndex + 1);

		try {
			assembler.currentPC = assembler.expressionEvaluator.evaluate(orgExpressionTokens, {
				pc: assembler.currentPC,
				allowForwardRef: true,
			});
		} catch (e) {
			console.warn(
				`[PASS 1] Warning on line ${token.line}: Failed to evaluate .ORG expression. Assuming 0x0000. Error: ${e}`,
			);
			assembler.currentPC = 0x0000;
		}

		return assembler.skipToEndOfLine(tokenIndex);
	}

	public handlePassTwo(assembler: Assembler, tokenIndex: number): number {
		const token = assembler.activeTokens[tokenIndex];
		const orgExpressionTokens = assembler.getInstructionTokens(tokenIndex + 1);
		try {
			const streamState = assembler.tokenStreamStack[assembler.tokenStreamStack.length - 1];
			assembler.currentPC = assembler.expressionEvaluator.evaluate(orgExpressionTokens, {
				pc: assembler.currentPC,
				macroArgs: streamState?.macroArgs,
			});
		} catch (e) {
			console.error(`ERROR on line ${token.line}: Failed to evaluate .ORG expression. ${e}`);
		}

		return assembler.skipToEndOfLine(tokenIndex);
	}
}
