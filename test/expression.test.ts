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

describe("Expression", () => {

	it('loads in Acc ascii of A', () => {
		const src= `
			lda #"A
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 41"));
	});

	it('loads in Acc ascii of A | $80 => $C1', () => {
		const src= `
			lda #"A|$80
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 C1"));
	});

	it('loads in Acc ascii of $C1 & $7F => $41', () => {
		const src= `
			lda #$C1 & $7f
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 41"));
	});

	it('loads in Acc ascii of %11001110 ^ $FF => $31', () => {
		const src= `
			lda #%11001110 ^ $FF
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 31"));
	});

});



