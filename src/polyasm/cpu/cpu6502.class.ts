import type { OperatorStackToken, Token } from "../lexer/lexer.class";
import type { AddressingMode, CPUHandler } from "./cpuhandler.class";

export class Cpu6502Handler implements CPUHandler {
	cpuType = "6502" as const;

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
		INDIRECT: "M6502_INDIRECT",
		ACCUMULATOR: "M6502_ACCUMULATOR",
	};

	// Simplified Instruction Definitions for LDA/STA: {mode_string: [opcode, bytes]}
	private instructionMap: Map<string, Map<AddressingMode, [number, number]>> = new Map([
		// ADC
		[
			"ADC",
			new Map([
				[this.M6502_MODES.IMMEDIATE, [0x69, 2]],
				[this.M6502_MODES.ZEROPAGE, [0x65, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0x75, 2]],
				[this.M6502_MODES.ABSOLUTE, [0x6d, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0x7d, 3]],
				[this.M6502_MODES.ABSOLUTE_Y, [0x79, 3]],
				[this.M6502_MODES.INDIRECT_X, [0x61, 2]],
				[this.M6502_MODES.INDIRECT_Y, [0x71, 2]],
			]),
		],
		// AND
		[
			"AND",
			new Map([
				[this.M6502_MODES.IMMEDIATE, [0x29, 2]],
				[this.M6502_MODES.ZEROPAGE, [0x25, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0x35, 2]],
				[this.M6502_MODES.ABSOLUTE, [0x2d, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0x3d, 3]],
				[this.M6502_MODES.ABSOLUTE_Y, [0x39, 3]],
				[this.M6502_MODES.INDIRECT_X, [0x21, 2]],
				[this.M6502_MODES.INDIRECT_Y, [0x31, 2]],
			]),
		],
		// ASL
		[
			"ASL",
			new Map([
				[this.M6502_MODES.ACCUMULATOR, [0x0a, 1]],
				[this.M6502_MODES.ZEROPAGE, [0x06, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0x16, 2]],
				[this.M6502_MODES.ABSOLUTE, [0x0e, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0x1e, 3]],
			]),
		],
		// BRANCH
		["BCC", new Map([[this.M6502_MODES.RELATIVE, [0x90, 2]]])],
		["BCS", new Map([[this.M6502_MODES.RELATIVE, [0xb0, 2]]])],
		["BEQ", new Map([[this.M6502_MODES.RELATIVE, [0xf0, 2]]])],
		["BNE", new Map([[this.M6502_MODES.RELATIVE, [0xd0, 2]]])],
		["BMI", new Map([[this.M6502_MODES.RELATIVE, [0x30, 2]]])],
		["BPL", new Map([[this.M6502_MODES.RELATIVE, [0x10, 2]]])],
		["BVC", new Map([[this.M6502_MODES.RELATIVE, [0x50, 2]]])],
		["BVS", new Map([[this.M6502_MODES.RELATIVE, [0x70, 2]]])],
		// BIT
		[
			"BIT",
			new Map([
				[this.M6502_MODES.ZEROPAGE, [0x24, 2]],
				[this.M6502_MODES.ABSOLUTE, [0x2c, 3]],
			]),
		],
		// BREAK
		["BRK", new Map([[this.M6502_MODES.IMPLIED, [0x00, 1]]])],
		// CLEAR
		["CLC", new Map([[this.M6502_MODES.IMPLIED, [0x18, 1]]])],
		["CLD", new Map([[this.M6502_MODES.IMPLIED, [0xd8, 1]]])],
		["CLI", new Map([[this.M6502_MODES.IMPLIED, [0x58, 1]]])],
		["CLV", new Map([[this.M6502_MODES.IMPLIED, [0xb8, 1]]])],
		// COMPARE
		[
			"CMP",
			new Map([
				[this.M6502_MODES.IMMEDIATE, [0xc9, 2]],
				[this.M6502_MODES.ZEROPAGE, [0xc5, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0xd5, 2]],
				[this.M6502_MODES.ABSOLUTE, [0xcd, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0xdd, 3]],
				[this.M6502_MODES.ABSOLUTE_Y, [0xd9, 3]],
				[this.M6502_MODES.INDIRECT_X, [0xc1, 2]],
				[this.M6502_MODES.INDIRECT_Y, [0xd1, 2]],
			]),
		],
		[
			"CPX",
			new Map([
				[this.M6502_MODES.IMMEDIATE, [0xe0, 2]],
				[this.M6502_MODES.ZEROPAGE, [0xe4, 2]],
				[this.M6502_MODES.ABSOLUTE, [0xec, 3]],
			]),
		],
		[
			"CPY",
			new Map([
				[this.M6502_MODES.IMMEDIATE, [0xc0, 2]],
				[this.M6502_MODES.ZEROPAGE, [0xc4, 2]],
				[this.M6502_MODES.ABSOLUTE, [0xcc, 3]],
			]),
		],
		// DECREMENT
		[
			"DEC",
			new Map([
				[this.M6502_MODES.ZEROPAGE, [0xc6, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0xd6, 2]],
				[this.M6502_MODES.ABSOLUTE, [0xce, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0xde, 3]],
			]),
		],
		["DEX", new Map([[this.M6502_MODES.IMPLIED, [0xca, 1]]])],
		["DEY", new Map([[this.M6502_MODES.IMPLIED, [0x88, 1]]])],
		// EOR
		[
			"EOR",
			new Map([
				[this.M6502_MODES.IMMEDIATE, [0x49, 2]],
				[this.M6502_MODES.ZEROPAGE, [0x45, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0x55, 2]],
				[this.M6502_MODES.ABSOLUTE, [0x4d, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0x5d, 3]],
				[this.M6502_MODES.ABSOLUTE_Y, [0x59, 3]],
				[this.M6502_MODES.INDIRECT_X, [0x41, 2]],
				[this.M6502_MODES.INDIRECT_Y, [0x51, 2]],
			]),
		],
		// INCREMENT
		[
			"INC",
			new Map([
				[this.M6502_MODES.ZEROPAGE, [0xe6, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0xf6, 2]],
				[this.M6502_MODES.ABSOLUTE, [0xee, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0xfe, 3]],
			]),
		],
		["INX", new Map([[this.M6502_MODES.IMPLIED, [0xe8, 1]]])],
		["INY", new Map([[this.M6502_MODES.IMPLIED, [0xc8, 1]]])],
		// JUMP
		[
			"JMP",
			new Map([
				[this.M6502_MODES.ABSOLUTE, [0x4c, 3]],
				[this.M6502_MODES.INDIRECT, [0x6c, 3]],
			]),
		],
		["JSR", new Map([[this.M6502_MODES.ABSOLUTE, [0x20, 3]]])],
		// LDA
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
		// LDX
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
		// LDY
		[
			"LDY",
			new Map([
				[this.M6502_MODES.IMMEDIATE, [0xa0, 2]],
				[this.M6502_MODES.ZEROPAGE, [0xa4, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0xb4, 2]],
				[this.M6502_MODES.ABSOLUTE, [0xac, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0xbc, 3]],
			]),
		],
		// LSR
		[
			"LSR",
			new Map([
				[this.M6502_MODES.ACCUMULATOR, [0x4a, 1]],
				[this.M6502_MODES.ZEROPAGE, [0x46, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0x56, 2]],
				[this.M6502_MODES.ABSOLUTE, [0x4e, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0x5e, 3]],
			]),
		],
		// NOP
		["NOP", new Map([[this.M6502_MODES.IMPLIED, [0xea, 1]]])],
		// ORA
		[
			"ORA",
			new Map([
				[this.M6502_MODES.IMMEDIATE, [0x09, 2]],
				[this.M6502_MODES.ZEROPAGE, [0x05, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0x15, 2]],
				[this.M6502_MODES.ABSOLUTE, [0x0d, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0x1d, 3]],
				[this.M6502_MODES.ABSOLUTE_Y, [0x19, 3]],
				[this.M6502_MODES.INDIRECT_X, [0x01, 2]],
				[this.M6502_MODES.INDIRECT_Y, [0x11, 2]],
			]),
		],
		// PUSH
		["PHA", new Map([[this.M6502_MODES.IMPLIED, [0x48, 1]]])],
		["PHP", new Map([[this.M6502_MODES.IMPLIED, [0x08, 1]]])],
		// PULL
		["PLA", new Map([[this.M6502_MODES.IMPLIED, [0x68, 1]]])],
		["PLP", new Map([[this.M6502_MODES.IMPLIED, [0x28, 1]]])],
		// ROTATE
		[
			"ROL",
			new Map([
				[this.M6502_MODES.ACCUMULATOR, [0x2a, 1]],
				[this.M6502_MODES.ZEROPAGE, [0x26, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0x36, 2]],
				[this.M6502_MODES.ABSOLUTE, [0x2e, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0x3e, 3]],
			]),
		],
		[
			"ROR",
			new Map([
				[this.M6502_MODES.ACCUMULATOR, [0x6a, 1]],
				[this.M6502_MODES.ZEROPAGE, [0x66, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0x76, 2]],
				[this.M6502_MODES.ABSOLUTE, [0x6e, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0x7e, 3]],
			]),
		],
		// RETURN
		["RTI", new Map([[this.M6502_MODES.IMPLIED, [0x40, 1]]])],
		["RTS", new Map([[this.M6502_MODES.IMPLIED, [0x60, 1]]])],
		// SBC
		[
			"SBC",
			new Map([
				[this.M6502_MODES.IMMEDIATE, [0xe9, 2]],
				[this.M6502_MODES.ZEROPAGE, [0xe5, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0xf5, 2]],
				[this.M6502_MODES.ABSOLUTE, [0xed, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0xfd, 3]],
				[this.M6502_MODES.ABSOLUTE_Y, [0xf9, 3]],
				[this.M6502_MODES.INDIRECT_X, [0xe1, 2]],
				[this.M6502_MODES.INDIRECT_Y, [0xf1, 2]],
			]),
		],
		// SET
		["SEC", new Map([[this.M6502_MODES.IMPLIED, [0x38, 1]]])],
		["SED", new Map([[this.M6502_MODES.IMPLIED, [0xf8, 1]]])],
		["SEI", new Map([[this.M6502_MODES.IMPLIED, [0x78, 1]]])],
		// STA
		[
			"STA",
			new Map([
				[this.M6502_MODES.ZEROPAGE, [0x85, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0x95, 2]],
				[this.M6502_MODES.ABSOLUTE, [0x8d, 3]],
				[this.M6502_MODES.ABSOLUTE_X, [0x9d, 3]],
				[this.M6502_MODES.ABSOLUTE_Y, [0x99, 3]],
				[this.M6502_MODES.INDIRECT_X, [0x81, 2]],
				[this.M6502_MODES.INDIRECT_Y, [0x91, 2]],
			]),
		],
		// STX
		[
			"STX",
			new Map([
				[this.M6502_MODES.ZEROPAGE, [0x86, 2]],
				[this.M6502_MODES.ZEROPAGE_Y, [0x96, 2]],
				[this.M6502_MODES.ABSOLUTE, [0x8e, 3]],
			]),
		],
		// STY
		[
			"STY",
			new Map([
				[this.M6502_MODES.ZEROPAGE, [0x84, 2]],
				[this.M6502_MODES.ZEROPAGE_X, [0x94, 2]],
				[this.M6502_MODES.ABSOLUTE, [0x8c, 3]],
			]),
		],
		// TRANSFER
		["TAX", new Map([[this.M6502_MODES.IMPLIED, [0xaa, 1]]])],
		["TAY", new Map([[this.M6502_MODES.IMPLIED, [0xa8, 1]]])],
		["TSX", new Map([[this.M6502_MODES.IMPLIED, [0xba, 1]]])],
		["TXA", new Map([[this.M6502_MODES.IMPLIED, [0x8a, 1]]])],
		["TXS", new Map([[this.M6502_MODES.IMPLIED, [0x9a, 1]]])],
		["TYA", new Map([[this.M6502_MODES.IMPLIED, [0x98, 1]]])],
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
	handleCPUSpecificDirective(_directive: string, _args: Token[]): void {}

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
	): {
		mode: AddressingMode;
		opcode: number;
		bytes: number;
		resolvedAddress: number;
	} {
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
			return {
				mode: this.M6502_MODES.IMPLIED,
				opcode,
				bytes,
				resolvedAddress: 0,
			};
		}

		// Accumulator
		if (numTokens === 1 && operandTokens[0].value.toUpperCase() === "A") {
			const op = instructionModes.get(this.M6502_MODES.ACCUMULATOR);
			if (!op) throw new Error(`Invalid addressing mode 'A' for ${mnemonic}`);
			const [opcode, bytes] = op;
			return {
				mode: this.M6502_MODES.ACCUMULATOR,
				opcode,
				bytes,
				resolvedAddress: 0,
			};
		}

		// 2. Immediate Mode (e.g., LDA #$42)
		if (operandTokens[0].value === "#") {
			const expressionTokens = operandTokens.slice(1);
			const resolvedAddress = resolveValue(expressionTokens);
			const [opcode, bytes] = instructionModes.get(this.M6502_MODES.IMMEDIATE) || [0x00, 2];
			return {
				mode: this.M6502_MODES.IMMEDIATE,
				opcode,
				bytes,
				resolvedAddress,
			};
		}

		// 3. Indirect, Indirect Indexed Modes
		if (operandTokens[0].value === "(") {
			const lastToken = operandTokens[numTokens - 1];

			// Indirect Y: (zp),Y
			if (lastToken.value.toUpperCase() === "Y" && operandTokens[numTokens - 2].value === ",") {
				const expressionTokens = this.extractTokensBetween(operandTokens, "(", ")");
				const resolvedAddress = resolveValue(expressionTokens);
				const [opcode, bytes] = instructionModes.get(this.M6502_MODES.INDIRECT_Y) || [0x00, 2];
				return {
					mode: this.M6502_MODES.INDIRECT_Y,
					opcode,
					bytes,
					resolvedAddress,
				};
			}

			if (lastToken.value.toUpperCase() === ")") {
				const secondToLast = operandTokens[numTokens - 2];
				// Indirect X: (zp,X)
				if (secondToLast.value.toUpperCase() === "X" && operandTokens[numTokens - 3].value === ",") {
					const expressionTokens = this.extractTokensBetween(operandTokens, "(", ",");
					const resolvedAddress = resolveValue(expressionTokens);
					const [opcode, bytes] = instructionModes.get(this.M6502_MODES.INDIRECT_X) || [0x00, 2];
					return {
						mode: this.M6502_MODES.INDIRECT_X,
						opcode,
						bytes,
						resolvedAddress,
					};
				}
				// Indirect JMP: ($addr)
				const expressionTokens = this.extractTokensBetween(operandTokens, "(", ")");
				const resolvedAddress = resolveValue(expressionTokens);
				const [opcode, bytes] = instructionModes.get(this.M6502_MODES.INDIRECT) || [0x00, 3];
				return {
					mode: this.M6502_MODES.INDIRECT,
					opcode,
					bytes,
					resolvedAddress,
				};
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
			return {
				mode: this.M6502_MODES.RELATIVE,
				opcode,
				bytes,
				resolvedAddress,
			};
		}

		// 6. Absolute/Zero Page Direct (e.g., LDA $1234 or LDA MyLabel)
		const resolvedAddress = resolveValue(operandTokens);
		const isZP = resolvedAddress >= 0x00 && resolvedAddress <= 0xff;

		let mode: AddressingMode;
		if (forcedSize === "ZP" || (forcedSize === null && isZP)) {
			mode = this.M6502_MODES.ZEROPAGE;
		} else {
			mode = this.M6502_MODES.ABSOLUTE;
		}

		const op = instructionModes.get(mode);
		if (!op) {
			// If ZP mode was tried and failed, maybe it's an instruction that only has ABS mode (like JMP)
			if (mode === this.M6502_MODES.ZEROPAGE) {
				const absOp = instructionModes.get(this.M6502_MODES.ABSOLUTE);
				if (absOp) return { mode: this.M6502_MODES.ABSOLUTE, opcode: absOp[0], bytes: absOp[1], resolvedAddress };
			}
			throw new Error(`Invalid addressing mode for instruction ${mnemonic}`);
		}
		const [opcode, bytes] = op;

		return { mode, opcode, bytes, resolvedAddress };
	}

	/** Pass 2: Encodes the instruction using the resolved mode and address. */
	encodeInstruction(
		_tokens: OperatorStackToken[],
		modeInfo: {
			mode: AddressingMode;
			resolvedAddress: number;
			opcode: number;
			bytes: number;
			pc: number;
		},
	): number[] {
		if (modeInfo.mode === this.M6502_MODES.RELATIVE) {
			const targetAddress = modeInfo.resolvedAddress;
			const instructionSize = modeInfo.bytes; // Should be 2 for branch instructions
			const offset = targetAddress - (modeInfo.pc + instructionSize);

			// Check if the offset is within the valid 8-bit signed range (-128 to 127)
			if (offset < -128 || offset > 127)
				throw new Error(`Branch target out of range. Target: $${targetAddress.toString(16)}, PC: $${modeInfo.pc.toString(16)}, Offset: ${offset}`);

			// Convert to 8-bit two's complement if negative
			const finalOffset = offset < 0 ? offset + 256 : offset;
			return [modeInfo.opcode, finalOffset];
		}

		const bytes: number[] = [modeInfo.opcode];

		if (modeInfo.bytes === 1) {
			return bytes;
		}

		const address = modeInfo.resolvedAddress;

		// Little-endian address encoding
		if (modeInfo.bytes === 2) {
			bytes.push(address & 0xff);
		} else if (modeInfo.bytes === 3) {
			bytes.push(address & 0xff);
			bytes.push((address >> 8) & 0xff);
		}

		return bytes;
	}
}
