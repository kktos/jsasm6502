import type { Assembler } from "../../polyasm";
import { ADVANCE_TO_NEXT_LINE, type DirectiveContext, type IDirective } from "../directive.interface";

export class MacroDirective implements IDirective {
	public handlePassOne(assembler: Assembler, context: DirectiveContext): number {
		return this.handleMacroDefinition(assembler, context.tokenIndex);
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): number {
		// Macro definitions are removed in Pass 1, so this should not be called.
		return ADVANCE_TO_NEXT_LINE;
	}

	/** Pass 1: Parses and stores a macro definition. */
	private handleMacroDefinition(assembler: Assembler, startIndex: number): number {
		const nameToken = assembler.activeTokens[startIndex + 1];
		const macroName = nameToken.value.toUpperCase();

		// 1. Find the end of the macro block
		const endTokenIndex = assembler.findMatchingDirective(startIndex);

		if (endTokenIndex >= assembler.activeTokens.length) {
			throw `[PASS 1] WARNING: Unmatched macro starting on line ${assembler.activeTokens[startIndex].line}.`;
		}

		// 2. Determine start of body
		const headerLine = assembler.activeTokens[startIndex].line;
		let bodyStart = assembler.skipToEndOfLine(startIndex); // default: next line
		for (
			let i = startIndex + 2;
			i < assembler.activeTokens.length && assembler.activeTokens[i].line === headerLine;
			i++
		) {
			const t = assembler.activeTokens[i];
			if (t.type === "LBRACE") {
				bodyStart = i + 1;
				break;
			}
		}

		const bodyTokens = assembler.activeTokens.slice(bodyStart, endTokenIndex);

		// 3. Robust parameter parsing
		const parameters: string[] = [];
		let i = startIndex + 2; // token after macro name
		while (i < bodyStart) {
			const t = assembler.activeTokens[i];
			if (!t) break;
			if (t.type === "IDENTIFIER") {
				parameters.push(t.value.toUpperCase());
			}
			// Move to the next token, skipping commas
			i++;
			if (assembler.activeTokens[i]?.type === "COMMA") i++;
		}

		assembler.macroDefinitions.set(macroName, {
			name: macroName,
			parameters: parameters,
			body: bodyTokens,
		});

		assembler.logger.log(`[PASS 1] Defined macro: ${macroName} with ${parameters.length} params.`);

		// 4. Remove the macro definition from the token stream
		const removeCount = endTokenIndex - startIndex + 1;
		assembler.activeTokens.splice(startIndex, removeCount);

		// 5. Adjust saved stream-state indexes
		for (const state of assembler.tokenStreamStack) {
			if (state.tokens === assembler.activeTokens && state.index > startIndex) {
				state.index = Math.max(startIndex, state.index - removeCount);
			}
		}

		// Set currentTokenIndex to the token after the removed block
		return startIndex;
	}
}
