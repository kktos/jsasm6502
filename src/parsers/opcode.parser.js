import { VAParseError } from "../helpers/errors.class.js";
import { high, low } from "../helpers/utils.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { ADDRMODE } from "../opcodes/65xxx.addrmodes.js";
import { parseExpression } from "../parsers/expression.parser.js";


export function parseOpcode(ctx) {

	let valueSize= 8;
	let token= ctx.lexer.token();
	const opcode= token.value;
	
	// console.log("parseOpcode 1",token);
	
	const opcodeTable= ctx.opcodes[opcode];
	if(opcodeTable==null)
		throw new VAParseError("OPCODE: Unknown opcode "+opcode);

	ctx.lexer.next();
	token= ctx.lexer.token();

	// console.log("parseOpcode 2",token);
	
	//
	// ASL (IMPLICIT ADDR MODE)
	//
	if(!token) {
		const obj= opcodeTable[ADDRMODE.IMPLICIT];
		if(obj == -1)
			throw new VAParseError("OPCODE: Invalid Address Mode for Opcode "+opcode);
			
		ctx.code.emits(ctx.pass, [obj]);
		return true;
	}
	
	//
	// LDA # parm (ABSOLUTE ADDR MODE)
	//
	if(token.type == TOKEN_TYPES.HASH) {
		const obj= opcodeTable[ADDRMODE.IMMEDIATE];
		if(obj == -1)
			throw new VAParseError("OPCODE: Invalid Address Mode for Opcode "+opcode);
			
			ctx.lexer.next();
			
		const parm= parseExpression(ctx, null, TOKEN_TYPES.NUMBER);		

		if(parm.value > 0xFF)
			throw new VAParseError("OPCODE: Absolute value must by 8 bits wide");

		ctx.code.emits(ctx.pass, [obj, parm.value]);
		return true;
	}

	//
	// LDA ( $00   )
	// JMP ( $0000 )
	// LDA ( $00   ) , Y
	// LDA ( $00   , X )
	//
	if(token.type == TOKEN_TYPES.LEFT_PARENT) {

		ctx.lexer.next();
		const addr= parseExpression(ctx, new Set([TOKEN_TYPES.COMMA, TOKEN_TYPES.RIGHT_PARENT]), TOKEN_TYPES.NUMBER);
		let obj= -1;

		switch(ctx.lexer.token().type) {

			case TOKEN_TYPES.RIGHT_PARENT: {

				ctx.lexer.next();

				// LDA ( $00   )
				// JMP ( $0000 )
				// if end of line
				// its either INDIRECT or INDIRECTZP
				if(!ctx.lexer.token()) {
					// if 8/16 bits, by default -> INDIRECT
					obj= opcodeTable[ADDRMODE.INDIRECT]					// if 8 bits, check if INDIRECTZP allowed
					if(addr.value < 0x100 && opcodeTable[ADDRMODE.INDIRECTZP] != -1)
						obj= opcodeTable[ADDRMODE.INDIRECTZP];
					else
						valueSize= 16;

					break;
				}

				// LDA ( $00   ) , Y
				if(!ctx.lexer.isToken(TOKEN_TYPES.COMMA))
					throw new VAParseError("OPCODE: Unknown addressing mode");

				ctx.lexer.next();

				const token= ctx.lexer.token();
				if(!token || token.type != TOKEN_TYPES.IDENTIFIER || token.value != "Y" )
					throw new VAParseError("OPCODE: Unknown addressing mode");

				ctx.lexer.next();
				
				obj= opcodeTable[ADDRMODE.INDIRECTZPY];
				break;
			}

			case TOKEN_TYPES.COMMA: {

				// LDA ( $00   , X )				
				ctx.lexer.next();
				const token= ctx.lexer.token();
				if(!token || token.type != TOKEN_TYPES.IDENTIFIER || token.value != "X" )
					break;

				ctx.lexer.next();
				if(!ctx.lexer.isToken(TOKEN_TYPES.RIGHT_PARENT))
					throw new VAParseError("OPCODE: missing closing parenthesis");
				ctx.lexer.next();
					
				obj= opcodeTable[ADDRMODE.INDIRECTZPX];
				break;
			}

					
				
		}

		if(obj == -1)
			throw new VAParseError("OPCODE: IAM2 Invalid Address Mode for Opcode "+opcode);
		
		const code= [obj];
		code.push(addr.value & 0xFF);
		if(valueSize==16)
			code.push(addr.value>>8 & 0xFF);

		ctx.code.emits(ctx.pass, code);
		return true;
	}

	// BNE parm
	// LDA parm
	// LDA parm , Y
	// LDA parm , X
	// console.log({ctx});
	// console.log(token);
	
	const addr= parseExpression(ctx, null, TOKEN_TYPES.NUMBER);

	// console.log("addr", JSON.stringify(addr));

	if(ctx.pass==2 && addr.value == undefined)
		throw new VAParseError(`OPCODE(${ctx.pass}): Target Address is undefined for Opcode ${opcode}`);

	// console.log({addr});

	let obj= opcodeTable[ADDRMODE.ABSOLUTE];
	let opSize= 16;
	
	if(!ctx.lexer.token()) {
		if(opcodeTable[ADDRMODE.RELATIVE] != -1) {
			obj= opcodeTable[ADDRMODE.RELATIVE];
			opSize= 8;
			addr.value-= (ctx.code.pc+2) & 0xffff;
			if(ctx.pass==2 && (addr.value<-128 || addr.value>127)) {
				throw new VAParseError("OPCODE: Target Address is out of range for Opcode "+opcode+" "+addr.value);
			}
		}
		else {
			if(addr.value < 0x100 && opcodeTable[ADDRMODE.ZP] != -1) {
				obj= opcodeTable[ADDRMODE.ZP];
				opSize= 8;
			}
		}
	}

	if(ctx.lexer.isToken(TOKEN_TYPES.COMMA)) {
		ctx.lexer.next();
		const reg= ctx.lexer.token();

		if(reg.type != TOKEN_TYPES.IDENTIFIER)
			throw new VAParseError("OPCODE: IAM3 Invalid Address Mode for Opcode "+opcode);

		switch(reg.value) {

			// LDA $1000,X
			// LDA $10,X
			case "X":				// if 8 bits, check if ZPX allowed
				if(addr.value < 0x100 && opcodeTable[ADDRMODE.ZPX] != -1) {
					obj= opcodeTable[ADDRMODE.ZPX];
					opSize= 8;
				}
				break;

			case "Y":				// if 8 bits, check if ZPX allowed
				if(addr.value < 0x100 && opcodeTable[ADDRMODE.ZPY] != -1) {
					obj= opcodeTable[ADDRMODE.ZPY];
					opSize= 8;
				}
				break;

			default:
				obj= -1;
		}
		ctx.lexer.next();
	}

	if(obj == -1)
		throw new VAParseError("OPCODE: IAM4 Invalid Address Mode for Opcode "+opcode);

	if(opSize==16)
		ctx.code.emits(ctx.pass, [obj, low(addr.value), high(addr.value)]);
	else
		ctx.code.emits(ctx.pass, [obj, low(addr.value)]);
	
	return true;

}
