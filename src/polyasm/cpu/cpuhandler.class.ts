import type { OperatorStackToken } from "../lexer/lexer.class";

/** * Defines the standard addressing modes recognizable by the assembler.
 * Changed to 'string' to allow CPU Handlers to define their own specific modes
 * (e.g., 'M6502_ABSOLUTE', 'M6809_INDIRECT').
 */
export type AddressingMode = string;

export interface CPUHandler {
	cpuType: string; //"6502" | "65816" | "6809" | "ARM_RISC";

	/** * Core method to determine the specific addressing mode, opcode, and size
	 * based on the mnemonic and the structure of the operand tokens.
	 * @param resolveValue A function provided by the Assembler to evaluate expressions.
	 */
	resolveAddressingMode(
		mnemonic: string,
		operandTokens: OperatorStackToken[],
		resolveValue: (tokens: OperatorStackToken[]) => number,
	): {
		mode: AddressingMode;
		opcode: number;
		bytes: number;
		resolvedAddress: number;
	};

	/** Checks if a given mnemonic corresponds to a known instruction for this CPU. */
	isInstruction(mnemonic: string): boolean;

	/** Encodes the instruction into raw bytes, typically relying on modeInfo calculated in Pass 1. */
	encodeInstruction(
		tokens: OperatorStackToken[],
		modeInfo: {
			mode: AddressingMode;
			resolvedAddress: number;
			opcode: number;
			bytes: number;
			pc: number;
		},
	): number[];

	getPCSize(): number;
	//constructor(logger: Logger); // Constructor signature for CPU handlers
}
