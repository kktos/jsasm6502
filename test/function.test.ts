import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler.js";

let output= "";

const opts= {
	readFile: (filename, fromFile, asBin) => {
		if(filename == "inc1")
			return {path: "", content: ".namespace two\nlda #count"};

		return {path: "", content: filename};
	},
	YAMLparse: () => "",
	listing: false,
	segments: null,
	console: {
		log: (s) => { output+= s+" | "; },
		error: (s) => {output+= s+" | "; },
		warn: (s) => { output+= s+" | "; }
	}
};

describe("Function", () => {

	it('tests a function with the wrong parm count', () => {
		output= "";
		const err= /TERM: Wrong number of parameters for function "LEN". Expected 1 Got 2/;
		const src= `
			.echo .len("one","two")
		`;
		let asmRes;
		expect(() => asmRes= assemble(src, opts)).toThrowError(err);
	});

});



