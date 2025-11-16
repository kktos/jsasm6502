import type { Assembler } from "../polyasm";
import type { IDirective } from "./directive.interface";

export class IncludeDirective implements IDirective {
	public handlePassOne(assembler: Assembler, tokenIndex: number): number {
		const token = assembler.activeTokens[tokenIndex];
		const filename = assembler.getFilenameArg(tokenIndex);

		if (filename) {
			try {
				const rawContent = assembler.fileHandler.readSourceFile(filename);
				// const newTokens = tokenize(rawContent);
				const newTokens = assembler.lexer.tokenize(rawContent);
				assembler.activeTokens.splice(tokenIndex + 1, 0, ...newTokens);
				console.log(`[PASS 1] Included and tokenized source file: ${filename}. ${newTokens.length} tokens inserted.`);
			} catch (e) {
				console.error(`[PASS 1] ERROR including file ${filename} on line ${token.line}: ${e}`);
			}
		} else {
			console.error(`[PASS 1] ERROR: .INCLUDE requires a string argument on line ${token.line}.`);
		}
		return tokenIndex + 1;
	}

	public handlePassTwo(assembler: Assembler, tokenIndex: number): number {
		// .INCLUDE is fully handled in Pass 1, so this is a no-op in Pass 2.
		return tokenIndex + 1;
	}
}
