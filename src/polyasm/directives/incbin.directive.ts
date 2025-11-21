import type { ScalarToken } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class IncbinDirective implements IDirective {
	public handlePassOne(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		const expressionTokens = assembler.getInstructionTokens();
		if (expressionTokens.length === 0) throw new Error(`[PASS 1] ERROR: .INCBIN requires a string argument on line ${directive.line}.`);

		// 2. Resolve the array from the symbol table
		const evaluationContext = {
			pc: assembler.currentPC,
			macroArgs: assembler.tokenStreamStack[assembler.tokenStreamStack.length - 1]?.macroArgs,
			assembler,
			currentGlobalLabel: assembler.getLastGlobalLabel?.() ?? undefined,
			options: assembler.options,
		};

		const filename = assembler.expressionEvaluator.evaluate(expressionTokens, evaluationContext);
		if (typeof filename !== "string") throw new Error(`[PASS 1] ERROR: .INCBIN requires a string argument on line ${directive.line}.`);

		try {
			const rawBytes = assembler.fileHandler.readBinaryFile(filename);
			assembler.currentPC += rawBytes.length;
			assembler.logger.log(`[PASS 1] Reserved ${rawBytes.length} bytes for binary file: ${filename}`);
		} catch (e) {
			assembler.logger.error(`[PASS 1] ERROR reading binary file ${filename} for size calculation: ${e}`);
		}

		return undefined;
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		const expressionTokens = assembler.getInstructionTokens();
		if (expressionTokens.length === 0) throw new Error(`[PASS 1] ERROR: .INCBIN requires a string argument on line ${directive.line}.`);

		// 2. Resolve the array from the symbol table
		const evaluationContext = {
			pc: assembler.currentPC,
			macroArgs: assembler.tokenStreamStack[assembler.tokenStreamStack.length - 1]?.macroArgs,
			assembler,
			currentGlobalLabel: assembler.getLastGlobalLabel?.() ?? undefined,
			options: assembler.options,
		};

		const filename = assembler.expressionEvaluator.evaluate(expressionTokens, evaluationContext);
		if (typeof filename !== "string") throw new Error(`[PASS 2] ERROR: .INCBIN requires a string argument on line ${directive.line}.`);

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
			const addressHex = assembler.currentPC.toString(16).padStart(4, "0").toUpperCase();
			assembler.logger.log(`[PASS 2] $${addressHex}: ${bytesStr.padEnd(8)} | Line ${directive.line}: .INCBIN "${filename}" (${rawBytes.length} bytes)`);
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : String(e);
			assembler.logger.error(`\n[PASS 2] FATAL ERROR on line ${directive.line}: Could not include binary file ${filename}. Error: ${errorMessage}`);
			throw new Error(`Assembly failed on line ${directive.line}: Binary include failed.`);
		}

		return undefined;
	}
}
