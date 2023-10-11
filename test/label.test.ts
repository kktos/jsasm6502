import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler.js";
import { readHexLine } from "../src/pragmas/data.pragma.js";

let output = "";

const opts = {
	readFile: (filename, fromFile, asBin) => {
		if (filename === "inc1")
			return { path: "", content: ".namespace two\nlda #count" };

		return { path: "", content: filename };
	},
	YAMLparse: () => "",
	listing: false,
	segments: null,
	console: {
		log: (s) => {
			output += `${s} | `;
		},
		error: (s) => {
			output += `${s} | `;
		},
		warn: (s) => {
			output += `${s} | `;
		},
	},
};

describe("Label", () => {

	it("should detect duplicate labels", () => {
		const src = `
			lda #0
			beq exit
			ldx #3
		exit
			ldy #0
		exit
			rts
		`;
		let asmRes;
		expect(() => asmRes === assemble(src, opts)).toThrowError("Duplicate Symbol : EXIT");

	});

});
