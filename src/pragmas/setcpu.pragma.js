import { VAParseError } from "../helpers/errors.class.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { cpu6502, cpu65c02, cpu65x02 } from "../opcodes/all.js";

export const CPU_NAMES= {
	cpu6502: "6502",
	cpu65X02: "65X02",
	cpu65C02: "65C02",
};

export function setcpu(ctx, name) {
	name= name.toUpperCase();
	switch(name) {
		case CPU_NAMES.cpu6502:
			ctx.opcodes= cpu6502;
			break;

		case CPU_NAMES.cpu65X02:
			ctx.opcodes= cpu65x02;
			break;

		case CPU_NAMES.cpu65C02:
			ctx.opcodes= cpu65c02;
			break;

		default:
			throw new VAParseError("Unknown cpu name");
	}
	ctx.cpu= CPU_NAMES["cpu" + name];
}

export function processSetCPU(ctx) {
	const tok= ctx.lexer.token();
	if(tok.type != TOKEN_TYPES.STRING)
		throw new VAParseError("Need cpu name string");

	setcpu(ctx, tok.value);
	ctx.lexer.next();
}
