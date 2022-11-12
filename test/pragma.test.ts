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

describe("Pragma", () => {

	it('tests .hex on a single line', () => {
		const src= `
		.hex	02
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("02"));
	});

	it('tests .hex on a single line with comment', () => {
		const src= `
		.hex 020304; width
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("020304"));
	});

	it('tests .hex block with comment', () => {
		const src= `
		.hex ; a comment
			02 03 04 ; another comment
			; yet another comment
		.end
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("020304"));
	});

});



