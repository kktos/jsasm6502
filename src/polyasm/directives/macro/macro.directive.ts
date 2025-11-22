import type { ScalarToken } from "../../lexer/lexer.class";
import type { Assembler } from "../../polyasm";
import type { DirectiveContext, IDirective } from "../directive.interface";

export class MacroDirective implements IDirective {
	public handlePassOne(directive: ScalarToken, assembler: Assembler, _context: DirectiveContext) {
		this.handleMacroDefinition(directive, assembler);
		return undefined;
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, _context: DirectiveContext) {
		assembler.skipToDirectiveEnd(directive.value);

		return undefined;
	}

	/** Pass 1: Parses and stores a macro definition. */
	private handleMacroDefinition(directive: ScalarToken, assembler: Assembler) {
		const nameToken = assembler.nextIdentifierToken();
		if (!nameToken) throw `[PASS 1] ERROR: Macro needs a name on line ${directive.line}.`;

		const macroName = nameToken.value;

		const parameters: string[] = [];
		const parameterTokens = assembler.getInstructionTokens(directive);

		if (parameterTokens.length > 0) {
			let paramIndex = 0;
			const hasParentheses = parameterTokens[paramIndex].value === "(";
			if (hasParentheses) paramIndex++;

			loop: while (paramIndex < parameterTokens.length) {
				const t = parameterTokens[paramIndex];
				switch (t.type) {
					case "IDENTIFIER":
						parameters.push(t.value);
						break;
					case "COMMA":
						break;
					default:
						break loop;
				}
				paramIndex++;
			}
			if (hasParentheses && parameterTokens[paramIndex].value === ")") paramIndex++;
			if (paramIndex !== parameterTokens.length) throw `[PASS 1] SYNTAS ERROR: Bad Macro parameter list on line ${directive.line}.`;
		}

		const bodyTokens = assembler.getDirectiveBlockTokens(directive.value);

		assembler.macroDefinitions.set(macroName, {
			name: macroName,
			parameters: parameters,
			body: bodyTokens,
		});

		assembler.logger.log(`[PASS 1] Defined macro: ${macroName} with ${parameters.length} params.`);
	}
}
