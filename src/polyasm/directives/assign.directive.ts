import type { ScalarToken } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class AssignDirective implements IDirective {
	public handlePassOne(directive: ScalarToken, assembler: Assembler, _context: DirectiveContext): void {
		const label = assembler.getLastGlobalLabel();
		if (!label) throw new Error(`Syntax error in line ${directive.line}`);

		assembler.handleSymbolInPassOne(directive, label);
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, _context: DirectiveContext): void {
		const label = assembler.getLastGlobalLabel();
		if (!label) throw new Error(`Syntax error in line ${directive.line}`);

		assembler.handleSymbolInPassTwo(label, directive);
	}
}
