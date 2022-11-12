import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler.js";
import { readHexLine } from "../src/pragmas/data.pragma.js";

let output= "";

const opts= {
	readFile: (filename, fromFile, asBin) => {
		return {path: "", content: filename};
	},
	YAMLparse: () => "",
	listing: false,
	segments: null,
	console: {
		log: (s) => { output+= s+"\n"; },
		error: (s) => {output+= s+"\n"; },
		warn: (s) => { output+= s+"\n"; }
	}
};

describe("Macro", () => {

	it('tests that labels work with expanded macro', () => {
		const src= `
			.macro test a,x,y
			lda.w a
			ldx.w x
			ldy.w y
			.end

			start:
			nop
			test 1,2,3
			end:
			nop
			jmp start
			jmp end
			.out .hex(start)," ", .hex(end)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(output.trim()).toStrictEqual("$1000 $100A");
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine(
				"EA AD 01 00 AE 02 00 AC 03 00 EA 4C 00 10 4C 0A 10"
				)
			);
	});

});



