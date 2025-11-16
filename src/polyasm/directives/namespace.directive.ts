import type { Assembler } from "../polyasm";
import type { IDirective } from "./directive.interface";

export class NamespaceDirective implements IDirective {
	public handlePassOne(assembler: Assembler, tokenIndex: number): number {
		this.setNamespace(assembler, tokenIndex);
		return assembler.skipToEndOfLine(tokenIndex);
	}

	public handlePassTwo(assembler: Assembler, tokenIndex: number): number {
		this.setNamespace(assembler, tokenIndex);
		return assembler.skipToEndOfLine(tokenIndex);
	}

	private setNamespace(assembler: Assembler, tokenIndex: number): void {
		const namespaceToken = assembler.activeTokens[tokenIndex + 1];
		if (namespaceToken) {
			assembler.symbolTable.setNamespace(namespaceToken.value);
			console.log(`[PASS 1/2] Switched namespace to: ${namespaceToken.value}`);
		} else {
			console.error(
				`ERROR on line ${assembler.activeTokens[tokenIndex].line}: .NAMESPACE directive requires an argument.`,
			);
		}
	}
}
