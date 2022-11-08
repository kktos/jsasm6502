import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler.js";
import { op65c02 } from "../src/opcodes/65C02.opcodes.js";
import { readHexLine } from "../src/pragmas/data.pragma.js";
import { test_65C02 } from "./test_65C02.data.js";

const opts= {
	readFile: (filename, fromFile, asBin) => ({path: "", content: filename}),
	YAMLparse: () => "",
	listing: false,
	segments: null,
	cpu: "65c02"
};

it("tests all instructions", () => {
	expect(Object.keys(test_65C02).length).toEqual(Object.keys(op65c02).length);
});

describe.each( Object.keys(test_65C02) )
	("%s", (instr) => {

		it("tests all opcodes", () => {
			expect(test_65C02[instr].length).toEqual(op65c02[instr].filter(v=>v>=0).length);
		});

		it.each(test_65C02[instr])
			('assembles %s', (src: any, bytes: any) => {
				const asmRes= assemble(src, opts);
				expect(asmRes).toBeDefined();
				expect(asmRes.obj.CODE).toStrictEqual(readHexLine(bytes));
			});

	});



