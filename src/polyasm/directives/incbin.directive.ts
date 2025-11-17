import type { Assembler } from "../polyasm";
import { ADVANCE_TO_NEXT_LINE, type DirectiveContext, type IDirective } from "./directive.interface";

export class IncbinDirective implements IDirective {
	public handlePassOne(assembler: Assembler, context: DirectiveContext): number {
		const { token, tokenIndex } = context;
		const filename = assembler.getFilenameArg(tokenIndex);

		if (filename) {
			try {
				const rawBytes = assembler.fileHandler.readBinaryFile(filename);
				assembler.currentPC += rawBytes.length;
				console.log(`[PASS 1] Reserved ${rawBytes.length} bytes for binary file: ${filename}`);
			} catch (e) {
				console.error(`[PASS 1] ERROR reading binary file ${filename} for size calculation: ${e}`);
			}
		} else {
			console.error(`[PASS 1] ERROR: .INCBIN requires a string argument on line ${token.line}.`);
		}
		return ADVANCE_TO_NEXT_LINE;
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): number {
		const { token, tokenIndex } = context;
		const instructionPC = assembler.currentPC;
		const filename = assembler.getFilenameArg(tokenIndex); // This helper still uses index

		if (filename) {
			try {
				const rawBytes = assembler.fileHandler.readBinaryFile(filename);

				assembler.outputBuffer.push(...rawBytes);
				assembler.currentPC += rawBytes.length;
				assembler.symbolTable.setSymbol("*", assembler.currentPC);

				const bytesStr =
					rawBytes
						.slice(0, 4)
						.map((b) => b.toString(16).padStart(2, "0").toUpperCase())
						.join(" ") + (rawBytes.length > 4 ? "..." : "");
				const addressHex = instructionPC.toString(16).padStart(4, "0").toUpperCase();
				console.log(
					`[PASS 2] $${addressHex}: ${bytesStr.padEnd(8)} | Line ${token.line}: .INCBIN "${filename}" (${rawBytes.length} bytes)`,
				);
			} catch (e) {
				const errorMessage = e instanceof Error ? e.message : String(e);
				console.error(
					`\n[PASS 2] FATAL ERROR on line ${token.line}: Could not include binary file ${filename}. Error: ${errorMessage}`,
				);
				throw new Error(`Assembly failed on line ${token.line}: Binary include failed.`);
			}
		}
		return ADVANCE_TO_NEXT_LINE;
	}
}
