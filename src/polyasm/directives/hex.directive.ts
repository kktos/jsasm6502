import type { ScalarToken } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class HexDirective implements IDirective {
	public handlePassOne(directive: ScalarToken, assembler: Assembler, _context: DirectiveContext) {
		const hexString = this.extractHexData(directive, assembler);

		try {
			const byteCount = hexString.replace(/\s/g, "").length / 2;
			assembler.currentPC += byteCount;
		} catch (e) {
			assembler.logger.warn(`[PASS 1] Warning on line ${directive.line}: Could not calculate size of .HEX block. ${e}`);
		}
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, _context: DirectiveContext) {
		const hexString = this.extractHexData(directive, assembler);

		const cleanedString = hexString.replace(/\s/g, "");
		if (cleanedString.length % 2 !== 0) throw new Error("Hex data must have an even number of digits.");

		const bytes: number[] = [];
		for (let i = 0; i < cleanedString.length; i += 2) {
			const byteString = cleanedString.substring(i, i + 2);
			const byte = Number.parseInt(byteString, 16);
			if (Number.isNaN(byte)) throw new Error(`Invalid hexadecimal character sequence: "${byteString}"`);

			bytes.push(byte);
		}

		if (assembler.isAssembling && bytes.length > 0) assembler.writeBytes(bytes);

		if (!assembler.isAssembling) assembler.currentPC += bytes.length;
	}

	/**
	 * Extracts the raw hexadecimal string from the source tokens,
	 * handling both inline `{...}` and block `.HEX...END` syntax.
	 * @returns A tuple of [hexDataString, endIndex].
	 */
	private extractHexData(directive: ScalarToken, assembler: Assembler) {
		const hexTokens = assembler.getDirectiveBlockTokens(directive.value);

		// The lexer will tokenize '0E' as NUMBER '0' and IDENTIFIER 'E', and '60' as NUMBER '60'.
		// We must join their values back together to form a single string of hex digits,
		// while ignoring any comments that might be inside the block.
		const hexString = hexTokens?.map((t) => t.raw ?? t.value).join("");

		return hexString ?? "";
	}
}
