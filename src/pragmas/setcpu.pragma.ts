import { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { cpu6502, cpu65c02, cpu65x02 } from "../opcodes/all";

export const CPU_NAMES: Record<string, string> = {
	cpu6502: "6502",
	cpu65X02: "65X02",
	cpu65C02: "65C02",
};

export function setcpu(ctx: Context, name?: string) {
	const cpuName = name ? name.toUpperCase() : CPU_NAMES.cpu6502;
	switch (cpuName) {
		case CPU_NAMES.cpu6502:
			ctx.opcodes = cpu6502;
			break;

		case CPU_NAMES.cpu65X02:
			ctx.opcodes = cpu65x02;
			break;

		case CPU_NAMES.cpu65C02:
			ctx.opcodes = cpu65c02;
			break;

		default:
			throw new VAParseError("Unknown cpu name");
	}
	ctx.cpu = CPU_NAMES[`cpu${cpuName}`];
}

export function processSetCPU(ctx: Context) {
	const tok = ctx.lexer.token();
	if (tok?.type !== TOKEN_TYPES.STRING) throw new VAParseError("Need cpu name string");

	setcpu(ctx, tok.asString);
	ctx.lexer.next();

	return true;
}
