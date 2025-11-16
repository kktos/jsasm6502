import type { Token } from "../lexer/lexer.class";

/** * Defines the standard addressing modes recognizable by the assembler.
 * Changed to 'string' to allow CPU Handlers to define their own specific modes
 * (e.g., 'M6502_ABSOLUTE', 'M6809_INDIRECT').
 */
export type AddressingMode = string;

/** Maps an addressing mode to its [opcode, byte size] tuple. */
type InstructionModeMap = Map<AddressingMode, [number, number]>;

export interface CPUHandler {
	cpuType: "6502" | "65816" | "6809" | "ARM_RISC";

	/** * Core method to determine the specific addressing mode, opcode, and size
	 * based on the mnemonic and the structure of the operand tokens.
	 * @param resolveValue A function provided by the Assembler to evaluate expressions.
	 */
	resolveAddressingMode(
		mnemonic: string,
		operandTokens: Token[],
		resolveValue: (tokens: Token[]) => number,
	): { mode: AddressingMode; opcode: number; bytes: number; resolvedAddress: number };

	/** Encodes the instruction into raw bytes, typically relying on modeInfo calculated in Pass 1. */
	encodeInstruction(
		tokens: Token[],
		modeInfo: { mode: AddressingMode; resolvedAddress: number; opcode: number },
	): number[];

	getPCSize(): number;
	handleCPUSpecificDirective(directive: string, args: Token[]): void;
}
