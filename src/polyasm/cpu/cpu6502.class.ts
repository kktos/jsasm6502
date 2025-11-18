import type { OperatorStackToken, Token } from "../lexer/lexer.class";
import type { AddressingMode, CPUHandler } from "./cpuhandler.class";

// No changes needed here, as the constructor already takes Logger and no console.log calls are present.
import type { Logger } from "../logger";
export class Cpu6502Handler implements CPUHandler {
	cpuType = "6502" as const;

	private logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	// Define M6502 specific modes internally
	private M6502_MODES = {
		IMPLIED: "M6502_IMPLIED",
		IMMEDIATE: "M6502_IMMEDIATE",
		ABSOLUTE: "M6502_ABSOLUTE",
		ABSOLUTE_X: "M6502_ABSOLUTE_X",
		ABSOLUTE_Y: "M6502_ABSOLUTE_Y",
		ZEROPAGE: "M6502_ZEROPAGE",
		ZEROPAGE_X: "M6502_ZEROPAGE_X",
		ZEROPAGE_Y: "M6502_ZEROPAGE_Y",
		INDIRECT_X: "M6502_INDIRECT_X",
		INDIRECT_Y: "M6502_INDIRECT_Y",
		RELATIVE: "M6502_RELATIVE",
	};

	// Simplified Instruction Definitions for LDA/STA: {mode_string: [opcode, bytes]}
	private instructionMap: Map<string, Map<AddressingMode, [number, number]>> = new Map([
		[
			"LDA",
			new Map([
				[this.M6502_MODES.IMMEDIATE, [0xa9, 2]],
				[this.M6502_MODES.ZEROPAGE, [0xa5, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0xb5, 2]],
				[this.M6502_MODES.ABSOLUTE, [0xad, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0xbd, 3]],
				[this.M6502_MODES.ABSOLUTE_Y, [0xb9, 3]],
				[this.M6502_MODES.INDIRECT_X, [0xa1, 2]],
				[this.M6502_MODES.INDIRECT_Y, [0xb1, 2]],
			]),
		],
		[
			"STA",
			new Map([
				[this.M6502_MODES.ZEROPAGE, [0x85, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0x95, 2]],
				[this.M6502_MODES.ABSOLUTE, [0x8d, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0x9d, 3]],
				[this.M6502_MODES.ABSOLUTE_Y, [0x99, 3]],
				[this.M6502_MODES.INDIRECT_X, [0x81, 2]],
				[this.M6502_MODES.INDIRECT_Y, [0x91, 2]], // Corrected STA Indirect Y (91)
			]),
		],
		[
			"LDX",
			new Map([
				[this.M6502_MODES.IMMEDIATE, [0xa2, 2]],
				[this.M6502_MODES.ZEROPAGE, [0xa6, 2]],
				[this.M6502_MODES.ZEROPAGE_Y, [0xb6, 2]],
				[this.M6502_MODES.ABSOLUTE, [0xae, 3]],
				[this.M6502_MODES.ABSOLUTE_Y, [0xbe, 3]],
			]),
		],
		["INX", new Map([[this.M6502_MODES.IMPLIED, [0xe8, 1]]])],
		["BNE", new Map([[this.M6502_MODES.RELATIVE, [0xd0, 2]]])],
		["RTS", new Map([[this.M6502_MODES.IMPLIED, [0x60, 1]]])],
	]);

	private branchMnemonics = new Set([
		"BPL", // Branch on PLus
		"BMI", // Branch on MInus
		"BVC", // Branch on oVerflow Clear
		"BVS", // Branch on oVerflow Set
		"BCC", // Branch on Carry Clear
		"BCS", // Branch on Carry Set
		"BNE", // Branch on Not Equal
		"BEQ", // Branch on EQual
	]);

	getPCSize(): number {
		return 16;
	}
	handleCPUSpecificDirective(directive: string, args: Token[]): void {}

	isInstruction(mnemonic: string): boolean {
		const baseMnemonic = mnemonic.toUpperCase().split(".")[0];
		return this.instructionMap.has(baseMnemonic);
	}

	/** Extracts tokens between two delimiters (e.g., inside parentheses). */
	private extractTokensBetween(tokens: OperatorStackToken[], startVal: string, endVal: string) {
		const start = tokens.findIndex((t) => t.value === startVal);
		const end = tokens.findIndex((t) => t.value === endVal);
		if (start === -1 || end === -1 || start >= end) return [];
		return tokens.slice(start + 1, end);
	}

	resolveAddressingMode(
		mnemonic: string,
		operandTokens: OperatorStackToken[],
		resolveValue: (tokens: OperatorStackToken[]) => number,
	): { mode: AddressingMode; opcode: number; bytes: number; resolvedAddress: number } {
		// Check if the base mnemonic is supported. If not, THROW to signal a potential label.
		const parts = mnemonic.toUpperCase().split(".");
		const baseMnemonic = parts[0];
		const sizeSuffix = parts.length > 1 ? parts[1] : "";

		const instructionModes = this.instructionMap.get(baseMnemonic);
		if (!instructionModes) {
			throw new Error(`Unknown instruction mnemonic: ${mnemonic}`);
		}

		// ... (rest of the mode detection logic is the same) ...
		let forcedSize: "ZP" | "ABS" | null = null;
		if (sizeSuffix === "B") forcedSize = "ZP";
		if (sizeSuffix === "W") forcedSize = "ABS";

		const numTokens = operandTokens.length;

		// 1. Implied Mode (e.g., RTS) - no operands
		if (numTokens === 0) {
			const [opcode, bytes] = instructionModes.get(this.M6502_MODES.IMPLIED) || [0x00, 1];
			return { mode: this.M6502_MODES.IMPLIED, opcode, bytes, resolvedAddress: 0 };
		}

		// 2. Immediate Mode (e.g., LDA #$42)
		if (operandTokens[0].value === "#") {
			const expressionTokens = operandTokens.slice(1);
			const resolvedAddress = resolveValue(expressionTokens);
			const [opcode, bytes] = instructionModes.get(this.M6502_MODES.IMMEDIATE) || [0x00, 2];
			return { mode: this.M6502_MODES.IMMEDIATE, opcode, bytes, resolvedAddress };
		}

		// 3. Indirect Indexed Modes (e.g., LDA ($40),Y or LDA ($40,X))
		if (operandTokens[0].value === "(") {
			const lastToken = operandTokens[numTokens - 1];

			if (lastToken.value.toUpperCase() === "Y" && operandTokens[numTokens - 2].value === ",") {
				const expressionTokens = this.extractTokensBetween(operandTokens, "(", ")");
				const resolvedAddress = resolveValue(expressionTokens);
				const [opcode, bytes] = instructionModes.get(this.M6502_MODES.INDIRECT_Y) || [0x00, 2];
				return { mode: this.M6502_MODES.INDIRECT_Y, opcode, bytes, resolvedAddress };
			}
			if (lastToken.value.toUpperCase() === ")") {
				const secondToLast = operandTokens[numTokens - 2];
				if (secondToLast.value.toUpperCase() === "X" && operandTokens[numTokens - 3].value === ",") {
					const expressionTokens = this.extractTokensBetween(operandTokens, "(", ",");
					const resolvedAddress = resolveValue(expressionTokens);
					const [opcode, bytes] = instructionModes.get(this.M6502_MODES.INDIRECT_X) || [0x00, 2];
					return { mode: this.M6502_MODES.INDIRECT_X, opcode, bytes, resolvedAddress };
				}
			}
		}

		// 4. Absolute/Zero Page Indexed Modes (e.g., LDA $1234,X or LDA $40,Y)
		const lastToken = operandTokens[numTokens - 1];
		if (lastToken.value.toUpperCase() === "X" || lastToken.value.toUpperCase() === "Y") {
			const indexReg = lastToken.value.toUpperCase();
			const comma = operandTokens[numTokens - 2].value;

			if (comma === ",") {
				const expressionTokens = operandTokens.slice(0, numTokens - 2);
				const resolvedAddress = resolveValue(expressionTokens);

				const isZP = resolvedAddress >= 0x00 && resolvedAddress <= 0xff;

				let mode: AddressingMode;
				if (forcedSize === "ZP" || (forcedSize === null && isZP)) {
					mode = indexReg === "X" ? this.M6502_MODES.ZEROPAGE_X : this.M6502_MODES.ZEROPAGE_Y;
				} else {
					mode = indexReg === "X" ? this.M6502_MODES.ABSOLUTE_X : this.M6502_MODES.ABSOLUTE_Y;
				}

				const [opcode, bytes] = instructionModes.get(mode) || [0x00, mode.includes("ZERO") ? 2 : 3];
				return { mode, opcode, bytes, resolvedAddress };
			}
		}

		// 5. Relative Mode (Branches)
		if (this.branchMnemonics.has(baseMnemonic)) {
			const resolvedAddress = resolveValue(operandTokens);
			const [opcode, bytes] = instructionModes.get(this.M6502_MODES.RELATIVE) || [0x00, 2];
			return { mode: this.M6502_MODES.RELATIVE, opcode, bytes, resolvedAddress };
		}

		// 5. Absolute/Zero Page Direct (e.g., LDA $1234 or LDA MyLabel)
		const resolvedAddress = resolveValue(operandTokens);
		const isZP = resolvedAddress >= 0x00 && resolvedAddress <= 0xff;

		let mode: AddressingMode;
		if (forcedSize === "ZP" || (forcedSize === null && isZP)) {
			mode = this.M6502_MODES.ZEROPAGE;
		} else {
			mode = this.M6502_MODES.ABSOLUTE;
		}

		const [opcode, bytes] = instructionModes.get(mode) || [0x00, mode.includes("ZERO") ? 2 : 3];

		return { mode, opcode, bytes, resolvedAddress };
	}

	/** Pass 2: Encodes the instruction using the resolved mode and address. */
	encodeInstruction(
		tokens: OperatorStackToken[],
		modeInfo: { mode: AddressingMode; resolvedAddress: number; opcode: number; bytes: number; pc: number },
	): number[] {
		// We now switch on the mode string defined internally by this handler.
		const mnemonic = tokens[0].value.toUpperCase();

		if (modeInfo.mode === this.M6502_MODES.RELATIVE) {
			const targetAddress = modeInfo.resolvedAddress;
			const instructionSize = modeInfo.bytes; // Should be 2 for branch instructions
			const offset = targetAddress - (modeInfo.pc + instructionSize);

			// Check if the offset is within the valid 8-bit signed range (-128 to 127)
			if (offset < -128 || offset > 127) {
				throw new Error(
					`Branch target out of range. Target: $${targetAddress.toString(16)}, PC: $${modeInfo.pc.toString(16)}, Offset: ${offset}`,
				);
			}

			// Convert to 8-bit two's complement if negative
			const finalOffset = offset < 0 ? offset + 256 : offset;
			return [modeInfo.opcode, finalOffset];
		}
		// Determine bytes based on the mode string (ZP modes are 2 bytes, ABS modes are 3)
		let bytesNeeded = 0;
		if (modeInfo.mode.includes("IMPLIED")) {
			bytesNeeded = 1;
		} else if (
			modeInfo.mode.includes("ZEROPAGE") ||
			modeInfo.mode.includes("IMMEDIATE") ||
			modeInfo.mode.includes("INDIRECT")
		) {
			bytesNeeded = 2;
		} else if (modeInfo.mode.includes("ABSOLUTE")) {
			bytesNeeded = 3;
		}

		const bytes: number[] = [modeInfo.opcode];
		const address = modeInfo.resolvedAddress;

		// Little-endian address encoding
		if (bytesNeeded === 2) {
			bytes.push(address & 0xff);
		} else if (bytesNeeded === 3) {
			bytes.push(address & 0xff);
			bytes.push((address >> 8) & 0xff);
		}

		return bytes;
	}
}
