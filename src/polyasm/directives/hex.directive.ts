import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class HexDirective implements IDirective {
	public handlePassOne(assembler: Assembler, context: DirectiveContext): number {
		const { token, tokenIndex } = context;
		const [hexString, endIndex] = this.extractHexData(assembler, tokenIndex);

		try {
			const byteCount = hexString.replace(/\s/g, "").length / 2;
			assembler.currentPC += byteCount;
		} catch (e) {
			assembler.logger.warn(`[PASS 1] Warning on line ${token.line}: Could not calculate size of .HEX block. ${e}`);
		}

		return endIndex + 1;
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): number {
		const { token, tokenIndex } = context;
		const [hexString, endIndex] = this.extractHexData(assembler, tokenIndex);

		// try {
		const cleanedString = hexString.replace(/\s/g, "");
		if (cleanedString.length % 2 !== 0) {
			throw new Error("Hex data must have an even number of digits.");
		}

		const bytes: number[] = [];
		for (let i = 0; i < cleanedString.length; i += 2) {
			const byteString = cleanedString.substring(i, i + 2);
			const byte = Number.parseInt(byteString, 16);
			if (Number.isNaN(byte)) {
				throw new Error(`Invalid hexadecimal character sequence: "${byteString}"`);
			}
			bytes.push(byte);
		}

		if (assembler.isAssembling && bytes.length > 0) {
			assembler.outputBuffer.push(...bytes);
		}
		assembler.currentPC += bytes.length;
		// } catch (e) {
		// 	console.error(`ERROR on line ${token.line}: Failed to parse .HEX data. ${e}`);
		// }

		return endIndex + 1;
	}

	/**
	 * Extracts the raw hexadecimal string from the source tokens,
	 * handling both inline `{...}` and block `.HEX...END` syntax.
	 * @returns A tuple of [hexDataString, endIndex].
	 */
	private extractHexData(assembler: Assembler, startIndex: number): [string, number] {
		const tokens = assembler.activeTokens;
		const nextToken = tokens[startIndex + 1];

		let bodyStart: number;
		let bodyEnd: number;

		if (nextToken?.type === "LBRACE") {
			// Inline mode: .HEX { ... }
			bodyStart = startIndex + 2;
			bodyEnd = assembler.findMatchingDirective(startIndex + 1);
		} else {
			// Block mode: .HEX ... .END
			bodyStart = assembler.skipToEndOfLine(startIndex);
			bodyEnd = assembler.findMatchingDirective(startIndex);
		}

		const hexTokens = tokens.slice(bodyStart, bodyEnd);
		// The lexer will tokenize '0E' as NUMBER '0' and IDENTIFIER 'E', and '60' as NUMBER '60'.
		// We must join their values back together to form a single string of hex digits,
		// while ignoring any comments that might be inside the block.
		const hexString = hexTokens
			.filter((t) => t.type !== "COMMENT")
			.map((t) => t.raw ?? t.value)
			.join("");

		return [hexString, bodyEnd];
	}
}
