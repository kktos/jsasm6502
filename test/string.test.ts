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

describe("Strings", () => {

	it('tests .text with a string', () => {
		const src= `
			.text "ABCD"
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("41 42 43 44"));
	});

	it('tests .text without string', () => {
		const err= /STRING: missing a string here/;
		const src= `
			.text
			.text "abcd"
		`;
		let asmRes;
		expect(() => asmRes= assemble(src, opts)).toThrowError(err);
	});

	it('tests .text with many strings', () => {
		const src= `
			.text "AB","CD"
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("41 42 43 44"));
	});

	it('tests .cstr with many strings', () => {
		const src= `
			.cstr "AB","CD"
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("41 42 00 43 44 00"));
	});

	it('tests .pstr with many strings', () => {
		const src= `
			.pstr "ABCD","ABCD"
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("04 41 42 43 44 04 41 42 43 44"));
	});

});



