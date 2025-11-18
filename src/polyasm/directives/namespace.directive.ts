import type { Assembler } from "../polyasm";
import { ADVANCE_TO_NEXT_LINE, type DirectiveContext, type IDirective } from "./directive.interface";

export class NamespaceDirective implements IDirective {
	public handlePassOne(assembler: Assembler, context: DirectiveContext): number {
		this.setNamespace(assembler, context.tokenIndex);
		return ADVANCE_TO_NEXT_LINE;
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): number {
		this.setNamespace(assembler, context.tokenIndex);
		return ADVANCE_TO_NEXT_LINE;
	}

	private setNamespace(assembler: Assembler, tokenIndex: number): void {
		const namespaceToken = assembler.activeTokens[tokenIndex + 1];
		if (namespaceToken) {
			assembler.symbolTable.setNamespace(namespaceToken.value);
			assembler.logger.log(`[PASS 1/2] Switched namespace to: ${namespaceToken.value}`);
		} else {
			assembler.logger.error(
				`ERROR on line ${assembler.activeTokens[tokenIndex].line}: .NAMESPACE directive requires an argument.`,
			);
		}
	}
}
