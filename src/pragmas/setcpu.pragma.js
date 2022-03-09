import { logLine } from "../log.js";
import { cpu6502, cpu65c02, cpu65x02 } from "../tables.js";

export const CPU_CONST= {
	"6502": 1,
	"65X02": 11,
	"65C02": 100,
};

export function setcpu(ctx, cpuName) {
	switch(cpuName) {
		case "6502":
			ctx.opcodes= cpu6502.opcodes;
			ctx.options.useIllegals= false;
			break;

		case "65X02":
			ctx.opcodes= cpu65x02.opcodes;
			ctx.options.useIllegals= true;
			break;

		case "65C02":
			ctx.opcodes= cpu65c02.opcodes;
			ctx.options.useIllegals= false;
			break;
	}
	ctx.cpu= CPU_CONST[cpuName];
}

export function processSetCPU(ctx, pragma) {
	setcpu(ctx, ctx.sym[ctx.ofs]);
	ctx.pict= ".SETCPU " + ctx.cpu;
	logLine(ctx);
	return true;
}
