import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { getHexWord, high, low } from "../helpers/utils";
import { TOKEN_TYPES } from "../lexer/token.class";
import { ADDRMODE } from "../opcodes/65xxx.addrmodes";
import { parseExpression, parseExpressionAsNumber } from "./expression/expression.parser";
import type { TExprStackItem } from "./expression/TExprStackItem.class";

const log = console.log;

export function isOpcode(ctx: Context) {
	const op = ctx.lexer.identifier();
	return op && Boolean(ctx.opcodes[op]);
}

function interpolateString(ctx: Context) {
	ctx.lexer.next();
	const res = parseExpression(ctx, undefined, TOKEN_TYPES.STRING);
	if (!res) throw new VAParseError(`OPCODE: No value for %(<expr)"`);

	if (!ctx.lexer.isToken(TOKEN_TYPES.RIGHT_PARENT)) throw new VAParseError(`OPCODE: Missing Right Parenthesis for %(<expr)"`);
	ctx.lexer.next();

	// log("%() VALUE",ctx.pass, `\n${res} - ${JSON.stringify(res)}`);

	ctx.lexer.pushSource(res.string);
	ctx.lexer.nextLine();
	const tokens = ctx.lexer.tokens;

	// log("%() PARM", `\n${ctx.lexer.dump()}`);

	ctx.lexer.popSource();
	ctx.lexer.insertTokens(tokens);

	// log("%() LINE", `\n${ctx.lexer.dump()}`);

	return ctx.lexer.token();
}

function interpolateVariable(ctx: Context) {
	const varName = ctx.lexer.identifier() ?? "";
	let varValue = ctx.symbols.get(varName);

	if (varValue?.type === TOKEN_TYPES.ARRAY) {
		ctx.lexer.next();
		if (!ctx.lexer.isToken(TOKEN_TYPES.LEFT_BRACKET)) {
			throw new VAParseError(`OPCODE: Missing index array for ${varName}`);
		}
		ctx.lexer.next();
		const index = parseExpressionAsNumber(ctx, new Set([TOKEN_TYPES.RIGHT_BRACKET]));
		if (!ctx.lexer.isToken(TOKEN_TYPES.RIGHT_BRACKET)) {
			throw new VAParseError(`OPCODE: Missing index array for ${varName}`);
		}
		varValue = varValue.array[index.number] as TExprStackItem;
	}

	if (!varValue) throw new VAParseError(`OPCODE: Unknown parameter name ${varName}`);
	if (!varValue.extra?.tokens) throw new VAParseError(`OPCODE: Unknown parameter ${varName}`);
	ctx.lexer.next();
	ctx.lexer.insertTokens(varValue?.extra?.tokens);
	return ctx.lexer.token();
}

export function parseOpcode(ctx: Context) {
	let valueSize = 0;
	const opcode = ctx.lexer.identifier();
	if (!opcode) return;

	// log("parseOpcode 1",token);

	const opcodeTable = ctx.opcodes[opcode];
	if (opcodeTable === null) throw new VAParseError(`OPCODE: Unknown ${ctx.cpu} opcode ${opcode} - ${ctx.lastLabel?.name}`);

	let token = ctx.lexer.next();

	// instr.b forces 8bits
	// instr.w forces 16bits
	if (token?.type === TOKEN_TYPES.DOT && !token.hasSpaceBefore) {
		token = ctx.lexer.next();
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
		token = ctx.lexer.next();
	}

	// log("parseOpcode 2",token);

	// dynamic tokenisation
	// LDA %( expr ) -> expr = "$1000,y" -> LDA $1000,Y
	// LDA %macroParam -> macroParam = #$45 -> LDA #$45
	if (token?.type === TOKEN_TYPES.PERCENT) {
		ctx.lexer.next();

		switch (ctx.lexer.tokenType()) {
			case TOKEN_TYPES.LEFT_PARENT:
				token = interpolateString(ctx);
				break;
			case TOKEN_TYPES.IDENTIFIER: {
				token = interpolateVariable(ctx);
				break;
			}
			default:
				throw new VAParseError(`OPCODE: Illegal character %"`);
		}
	}

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

		const parm = parseExpressionAsNumber(ctx);

		if (parm.number > 0xff || valueSize === 16) throw new VAParseError("OPCODE: Absolute value must by 8 bits wide");

		ctx.code.emits(ctx.pass, [obj, parm.number]);
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
		const addr = parseExpressionAsNumber(ctx, new Set([TOKEN_TYPES.COMMA, TOKEN_TYPES.RIGHT_PARENT]));
		let obj = -1;

		switch (ctx.lexer.tokenType()) {
			case TOKEN_TYPES.RIGHT_PARENT: {
				ctx.lexer.next();

				// LDA ( $00   )
				// JMP ( $0000 )
				// if end of line
				// its either INDIRECT or INDIRECTZP
				if (!ctx.lexer.token()) {
					if (valueSize !== 16 && addr.number < 0x100 && opcodeTable[ADDRMODE.INDIRECTZP] !== -1) {
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

				if (valueSize !== 16 && addr.number < 0x100) {
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

				if (valueSize !== 16 && addr.number < 0x100) {
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
		code.push(addr.number & 0xff);
		if (valueSize === 16) code.push((addr.number >> 8) & 0xff);

		ctx.code.emits(ctx.pass, code);
		return true;
	}

	// BNE addr
	// LDA addr
	// LDA addr , Y
	// LDA addr , X
	// console.log({ctx});

	// log(token);

	const addr = parseExpressionAsNumber(ctx);

	// log("addr", ctx.pass, token, " -- ", JSON.stringify(addr), " -- ", addr);

	if (ctx.pass === 2 && addr.number === undefined) throw new VAParseError(`OPCODE(${ctx.pass}): Target Address is undefined for Opcode ${opcode}`);

	// log(ctx.pass, {opcode, addr});

	let obj = -1;

	if (!ctx.lexer.token()) {
		// log(ctx.pass, valueSize, "LINE", ctx.lexer.line());

		if (valueSize !== 16) {
			// log(ctx.pass, "addr.number < 0x100", addr.number < 0x100, "RELATIVE", opcodeTable[ADDRMODE.RELATIVE], "ZP", opcodeTable[ADDRMODE.ZP]);

			if (opcodeTable[ADDRMODE.RELATIVE] !== -1) {
				obj = opcodeTable[ADDRMODE.RELATIVE];
				valueSize = 8;
				addr.number -= (ctx.code.pc + 2) & 0xffff;
				if (ctx.pass === 2 && (addr.number < -128 || addr.number > 127)) {
					throw new VAParseError(`OPCODE: Target Address is out of range for Opcode ${opcode} ${addr.number}`);
				}
			} else if (addr.isDefined && addr.number < 0x100 && opcodeTable[ADDRMODE.ZP] !== -1) {
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

		if (!reg || reg.type !== TOKEN_TYPES.IDENTIFIER) throw new VAParseError(`OPCODE: IAM3 Invalid Address Mode for Opcode ${opcode}`);

		switch (reg.value) {
			// LDA $1000,X
			// LDA $10,X
			case "X": // if 8 bits, check if ZPX allowed
				if (valueSize !== 16 && addr.isDefined && addr.number < 0x100 && opcodeTable[ADDRMODE.ZPX] !== -1) {
					obj = opcodeTable[ADDRMODE.ZPX];
					valueSize = 8;
				} else if (valueSize !== 8) {
					obj = opcodeTable[ADDRMODE.ABSOLUTEX];
					valueSize = 16;
				}
				break;

			case "Y": // if 8 bits, check if ZPX allowed
				if (valueSize !== 16 && addr.isDefined && addr.number < 0x100 && opcodeTable[ADDRMODE.ZPY] !== -1) {
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

	// log("CODE", valueSize.toString().padStart(2," "), ctx.lexer.line(), valueSize === 8 ? hexDump([obj, low(addr.number)]) : hexDump([obj, low(addr.number), high(addr.number)]));

	if (ctx.pass > 1 && ["JSR", "JMP"].includes(opcode)) {
		log(opcode, addr ? getHexWord(addr.number ?? 0) : "????");
	}

	if (valueSize === 8) ctx.code.emits(ctx.pass, [obj, low(addr.number)]);
	else ctx.code.emits(ctx.pass, [obj, low(addr.number), high(addr.number)]);

	return true;
}
