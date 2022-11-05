import { describe, expect, it } from "vitest";

import { assemble } from "../src/main.js";
import { cpu6502 } from "../src/opcodes/6502.opcodes.js";
import { readHexLine } from "../src/pragmas/data.pragma.js";
import { test_6502 } from "./test_6502.data.js";

const opts= {
	readFile: (filename, fromFile, asBin) => ({path: "", content: filename}),
	YAMLparse: () => "",
	listing: false,
	segments: null
};

it("tests all instructions", () => {
	expect(Object.keys(test_6502).length).toEqual(Object.keys(cpu6502).length);
});

describe.each( Object.keys(test_6502) )
	("%s", (instr) => {

		it("tests all opcodes", () => {
			expect(test_6502[instr].length).toEqual(cpu6502[instr].filter(v=>v>=0).length);
		});

		it.each(test_6502[instr])
			('assembles %s', (src: any, bytes: any) => {
				const asmRes= assemble(src, opts);
				expect(asmRes).toBeDefined();
				expect(asmRes.obj.CODE).toStrictEqual(readHexLine(bytes));
			});

	});



