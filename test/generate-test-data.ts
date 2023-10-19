import * as fs from "node:fs";

import { cpu6502 } from "../src/opcodes/6502.opcodes";
import { op65c02 } from "../src/opcodes/65C02.opcodes";
import { ADDRMODE } from "../src/opcodes/65xxx.addrmodes";

function hex(num: number) {
	return num.toString(16).toUpperCase().padStart(2, "0");
}

function makeContent(name: string, instrList: typeof cpu6502) {
	let out = `export const ${name}= {\n`;

	Object.keys(instrList).forEach((instr) => {
		out += `\t${instr.toUpperCase()}: [\n`;

		instrList[instr].forEach((opcode: number, addrMode: number) => {
			if (opcode < 0) return;

			out += `\t\t["${instr.toUpperCase()}`;

			switch (addrMode) {
				case ADDRMODE.IMPLICIT:
					out += `", "${hex(opcode)}"`;
					break;
				case ADDRMODE.IMMEDIATE:
					out += ` #$12", "${hex(opcode)} 12"`;
					break;

				case ADDRMODE.ABSOLUTE:
					out += ` $1234", "${hex(opcode)} 34 12"`;
					break;
				case ADDRMODE.ABSOLUTEX:
					out += ` $1234,x", "${hex(opcode)} 34 12"`;
					break;
				case ADDRMODE.ABSOLUTEY:
					out += ` $1234,y", "${hex(opcode)} 34 12"`;
					break;

				case ADDRMODE.ZP:
					out += ` $12", "${hex(opcode)} 12"`;
					break;
				case ADDRMODE.ZPX:
					out += ` $12,x", "${hex(opcode)} 12"`;
					break;
				case ADDRMODE.ZPY:
					out += ` $12,y", "${hex(opcode)} 12"`;
					break;

				case ADDRMODE.INDIRECT:
					out += ` ($1234)", "${hex(opcode)} 34 12"`;
					break;
				case ADDRMODE.INDIRECTZPX:
					out += ` ($12,x)", "${hex(opcode)} 12"`;
					break;
				case ADDRMODE.INDIRECTZPY:
					out += ` ($12),y", "${hex(opcode)} 12"`;
					break;

				case ADDRMODE.RELATIVE:
					out += ` *", "${hex(opcode)} FE"`;
					break;

				case ADDRMODE.ABSINDIRECTX:
					out += ` ($1234,x)", "${hex(opcode)} 34 12"`;
					break;

				case ADDRMODE.INDIRECTZP:
					out += ` ($12)", "${hex(opcode)} 12"`;
					break;
			}

			out += "],\n";
		});

		out += "\t],\n";
	});
	out += "};";
	return out;
}

let fh;

fh = fs.openSync("./test/test_6502.data.ts", "w");
fs.writeSync(fh, makeContent("test_6502", cpu6502));
fs.closeSync(fh);

fh = fs.openSync("./test/test_65C02.data.ts", "w");
fs.writeSync(fh, makeContent("test_65C02", op65c02));
fs.closeSync(fh);
