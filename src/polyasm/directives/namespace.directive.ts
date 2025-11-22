import type { IdentifierToken, ScalarToken } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class NamespaceDirective implements IDirective {
	public handlePassOne(directive: ScalarToken, assembler: Assembler, context: DirectiveContext): void {
		this.setNamespace(directive, assembler, context);
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, context: DirectiveContext): void {
		this.setNamespace(directive, assembler, context);
	}

	private setNamespace(directive: ScalarToken, assembler: Assembler, _context: DirectiveContext): void {
		const tokens = assembler.getInstructionTokens(directive);
		// If no argument provided, reset to GLOBAL namespace (behave like `.NAMESPACE GLOBAL`)
		if (tokens.length === 0) {
			assembler.symbolTable.setNamespace("global");
			assembler.logger.log(`[PASS] Switched namespace to: ${assembler.symbolTable.getCurrentNamespace()}`);
			return;
		}

		const token = tokens[0] as IdentifierToken;
		if (token.type !== "IDENTIFIER") {
			assembler.logger.error(`ERROR on line ${directive.line}: .NAMESPACE directive requires an identifier.`);
			return;
		}

		const ns = token.value;
		assembler.symbolTable.pushNamespace(ns);
		assembler.logger.log(`[PASS] Entered namespace: ${ns}`);
	}
}
