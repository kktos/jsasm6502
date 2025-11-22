import type { ScalarToken } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import { ADVANCE_TO_NEXT_LINE, type DirectiveContext, type IDirective } from "./directive.interface";

export class IncludeDirective implements IDirective {
	public handlePassOne(directive: ScalarToken, assembler: Assembler, _context: DirectiveContext) {
		// const startIndex = assembler.getPosition();

		// Find expression tokens on the header line after 'OF', optionally followed by 'AS'
		const expressionTokens = assembler.getInstructionTokens();
		// let asIndex = exprHeader.findIndex((t) => t.type === "IDENTIFIER" && t.value === "AS");
		// if (asIndex === -1) asIndex = exprHeader.length;
		// const expressionTokens = exprHeader.slice(0, asIndex);
		// const indexIteratorToken = asIndex < exprHeader.length ? (exprHeader[asIndex + 1] as IdentifierToken) : undefined;

		if (expressionTokens.length === 0) throw new Error(`[PASS 1] ERROR: .INCLUDE requires a string argument on line ${directive.line}.`);

		// 2. Resolve the array from the symbol table
		const evaluationContext = {
			pc: assembler.currentPC,
			macroArgs: assembler.tokenStreamStack[assembler.tokenStreamStack.length - 1]?.macroArgs,
			assembler,
			currentGlobalLabel: assembler.getLastGlobalLabel?.() ?? undefined,
			options: assembler.options,
		};

		const filename = assembler.expressionEvaluator.evaluate(expressionTokens, evaluationContext);
		if (typeof filename !== "string") throw new Error(`[PASS 1] ERROR: .INCLUDE requires a string argument on line ${directive.line}.`);

		try {
			const rawContent = assembler.fileHandler.readSourceFile(filename);
			const newTokens = assembler.lexer.tokenize(rawContent);

			// Advance main stream past the include directive so the pushed stream won't loop.
			// assembler.setPosition(startIndex + 1);

			// Push the included tokens as a new stream so they are processed immediately.
			assembler.pushTokenStream(newTokens);

			assembler.logger.log(`[PASS 1] Included and tokenized source file: ${filename}. ${newTokens.length} tokens pushed as stream.`);
		} catch (e) {
			assembler.logger.error(`[PASS 1] ERROR including file ${filename} on line ${directive.line}: ${e}`);
		}

		return undefined;
	}

	public handlePassTwo(_directive: ScalarToken, _assembler: Assembler, _context: DirectiveContext): number {
		return ADVANCE_TO_NEXT_LINE;
	}
}
