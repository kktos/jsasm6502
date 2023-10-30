import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { high, low } from "../helpers/utils";
import { TOKEN_TYPES, Token } from "../lexer/token.class";
import { ADDRMODE } from "../opcodes/65xxx.addrmodes";
import { parseExpression } from "./expression/expression.parser";
import { TExprStackItemNumber } from "./expression/expression.type";

const log = console.log;

export function isIdentifierAnOpcode(ctx: Context) {
	const token = ctx.lexer.token();
	if (!token || token.type !== TOKEN_TYPES.IDENTIFIER) return false;
	return Boolean(ctx.opcodes[token.asString]);
}

export function parseOpcode(ctx: Context) {
	let valueSize = 0;
	let token = ctx.lexer.token();
	if (!token || token.type !== TOKEN_TYPES.IDENTIFIER) return;

	const opcode = token.asString;

	// log("parseOpcode 1",token);

	const opcodeTable = ctx.opcodes[opcode];
	if (opcodeTable == null)
		throw new VAParseError(`OPCODE: Unknown ${ctx.cpu} opcode ${opcode} - ${ctx.lastLabel?.name}`);

	ctx.lexer.next();
	token = ctx.lexer.token();

	// instr.b forces 8bits
	// instr.w forces 16bits
	if (token?.type === TOKEN_TYPES.DOT && !token.hasSpaceBefore) {
		ctx.lexer.next();
		token = ctx.lexer.token();
		if (token?.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError("OPCODE: Invalid data size; needs .w or .b");
		switch (token.value) {
			case "B":
				valueSize = 8;
				break;
			case "W":
				valueSize = 16;
				break;
			default:
				throw new VAParseError("OPCODE: Invalid data size; needs .w or .b");
		}
		ctx.lexer.next();
		token = ctx.lexer.token();
	}

	// log("parseOpcode 2",token);

	//
	// ASL (IMPLICIT ADDR MODE)
	//
	if (!token) {
		const obj = opcodeTable[ADDRMODE.IMPLICIT];
		if (obj === -1) throw new VAParseError(`OPCODE: Invalid Address Mode for Opcode ${opcode}`);

		ctx.code.emits(ctx.pass, [obj]);
		return true;
	}

	//
	// LDA # parm (ABSOLUTE ADDR MODE)
	//
	if (token.type === TOKEN_TYPES.HASH) {
		const obj = opcodeTable[ADDRMODE.IMMEDIATE];
		if (obj === -1) throw new VAParseError(`OPCODE: Invalid Address Mode for Opcode ${opcode}`);

		ctx.lexer.next();

		const parm = parseExpression(ctx, undefined, TOKEN_TYPES.NUMBER) as TExprStackItemNumber;

		if (parm.value > 0xff || valueSize === 16) throw new VAParseError("OPCODE: Absolute value must by 8 bits wide");

		ctx.code.emits(ctx.pass, [obj, parm.value]);
		return true;
	}

	//
	// LDA ( $00   )
	// JMP ( $0000 )
	// LDA ( $00   ) , Y
	// LDA ( $00   , X )
	//
	if (token.type === TOKEN_TYPES.LEFT_PARENT) {
		ctx.lexer.next();
		const addr = parseExpression(
			ctx,
			new Set([TOKEN_TYPES.COMMA, TOKEN_TYPES.RIGHT_PARENT]),
			TOKEN_TYPES.NUMBER,
		) as TExprStackItemNumber;
		let obj = -1;

		switch (ctx.lexer.tokenType()) {
			case TOKEN_TYPES.RIGHT_PARENT: {
				ctx.lexer.next();

				// LDA ( $00   )
				// JMP ( $0000 )
				// if end of line
				// its either INDIRECT or INDIRECTZP
				if (!ctx.lexer.token()) {
					if (valueSize !== 16 && addr.value < 0x100 && opcodeTable[ADDRMODE.INDIRECTZP] !== -1) {
						obj = opcodeTable[ADDRMODE.INDIRECTZP];
						valueSize = 8;
					} else if (valueSize !== 8) {
						obj = opcodeTable[ADDRMODE.INDIRECT];
						valueSize = 16;
					}
					break;
				}

				// LDA ( $00   ) , Y
				if (!ctx.lexer.isToken(TOKEN_TYPES.COMMA)) throw new VAParseError("OPCODE: Unknown addressing mode");

				ctx.lexer.next();

				if (!ctx.lexer.isIdentifier("Y")) throw new VAParseError("OPCODE: Unknown addressing mode");

				ctx.lexer.next();

				if (valueSize !== 16 && addr.value < 0x100) {
					obj = opcodeTable[ADDRMODE.INDIRECTZPY];
					valueSize = 8;
				}
				break;
			}

			case TOKEN_TYPES.COMMA: {
				// LDA ( $00   , X )
				// JMP ( $1234 , X )
				ctx.lexer.next();
				if (!ctx.lexer.isIdentifier("X")) break;

				ctx.lexer.next();
				if (!ctx.lexer.isToken(TOKEN_TYPES.RIGHT_PARENT)) throw new VAParseError("OPCODE: missing closing parenthesis");
				ctx.lexer.next();

				if (valueSize !== 16 && addr.value < 0x100) {
					valueSize = 8;
					obj = opcodeTable[ADDRMODE.INDIRECTZPX];
				} else if (valueSize !== 8) {
					obj = opcodeTable[ADDRMODE.ABSINDIRECTX];
					valueSize = 16;
				}
				break;
			}
		}

		if (obj === -1) throw new VAParseError(`OPCODE: IAM2 Invalid Address Mode for Opcode ${opcode}`);

		const code = [obj];
		code.push(addr.value & 0xff);
		if (valueSize === 16) code.push((addr.value >> 8) & 0xff);

		ctx.code.emits(ctx.pass, code);
		return true;
	}

	// BNE addr
	// LDA addr
	// LDA addr , Y
	// LDA addr , X
	// console.log({ctx});

	// log(token);

	const addr = parseExpression(ctx, undefined, TOKEN_TYPES.NUMBER) as TExprStackItemNumber;

	// console.log("addr", JSON.stringify(addr));

	if (ctx.pass === 2 && addr.value === undefined)
		throw new VAParseError(`OPCODE(${ctx.pass}): Target Address is undefined for Opcode ${opcode}`);

	// console.log({addr});

	let obj = -1;

	if (!ctx.lexer.token()) {
		if (valueSize !== 16) {
			if (opcodeTable[ADDRMODE.RELATIVE] !== -1) {
				obj = opcodeTable[ADDRMODE.RELATIVE];
				valueSize = 8;
				addr.value -= (ctx.code.pc + 2) & 0xffff;
				if (ctx.pass === 2 && (addr.value < -128 || addr.value > 127)) {
					throw new VAParseError(`OPCODE: Target Address is out of range for Opcode ${opcode} ${addr.value}`);
				}
			} else if (addr.value < 0x100 && opcodeTable[ADDRMODE.ZP] !== -1) {
				obj = opcodeTable[ADDRMODE.ZP];
				valueSize = 8;
			}
		}

		if (valueSize !== 8) {
			obj = opcodeTable[ADDRMODE.ABSOLUTE];
			valueSize = 16;
		}
	} else if (ctx.lexer.isToken(TOKEN_TYPES.COMMA)) {
		ctx.lexer.next();
		const reg = ctx.lexer.token();

		if (!reg || reg.type !== TOKEN_TYPES.IDENTIFIER)
			throw new VAParseError(`OPCODE: IAM3 Invalid Address Mode for Opcode ${opcode}`);

		switch (reg.value) {
			// LDA $1000,X
			// LDA $10,X
			case "X": // if 8 bits, check if ZPX allowed
				if (valueSize !== 16 && addr.value < 0x100 && opcodeTable[ADDRMODE.ZPX] !== -1) {
					obj = opcodeTable[ADDRMODE.ZPX];
					valueSize = 8;
				} else if (valueSize !== 8) {
					obj = opcodeTable[ADDRMODE.ABSOLUTEX];
					valueSize = 16;
				}
				break;

			case "Y": // if 8 bits, check if ZPX allowed
				if (valueSize !== 16 && addr.value < 0x100 && opcodeTable[ADDRMODE.ZPY] !== -1) {
					obj = opcodeTable[ADDRMODE.ZPY];
					valueSize = 8;
				} else if (valueSize !== 8) {
					obj = opcodeTable[ADDRMODE.ABSOLUTEY];
					valueSize = 16;
				}
				break;

			// default:
			// 	obj= -1;
		}
		ctx.lexer.next();
	}

	if (obj === -1) throw new VAParseError(`OPCODE: IAM4 Invalid Address Mode for Opcode ${opcode} ${valueSize}`);

	if (valueSize === 8) ctx.code.emits(ctx.pass, [obj, low(addr.value)]);
	else ctx.code.emits(ctx.pass, [obj, low(addr.value), high(addr.value)]);

	return true;
}
