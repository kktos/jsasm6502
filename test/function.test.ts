import { beforeEach, describe, expect, it } from "vitest";

import { load } from "js-yaml";
import { assemble } from "../src/assembler.js";
let output = "";

const opts = {
	readFile: (filename, fromFile, asBin) => {
		if (filename === "inc1")
			return { path: "", content: ".namespace two\nlda #count" };

		return { path: "", content: filename };
	},
	YAMLparse: (s) => load(s),
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

describe("Function", () => {
	beforeEach(() => {
		output = "";
	});

	it("tests a function with the wrong parm count", () => {
		const err =
			/TERM: Wrong number of parameters for function "LEN". Expected 1 Got 2/;
		const src = `
			.echo .len("one","two")
		`;
		let asmRes;
		expect(() => asmRes === assemble(src, opts)).toThrowError(err);
	});

	it("tests .type with various types", () => {
		const src = `
		.define arr
		- one
		- two
		.end
		.define obj
		test:
		.end
		.log .type(arr)
		.log .type(obj)
		.log .type("one")
		.log .type(1)
		`;
		const asmRes = assemble(src, opts);
		expect(output.trim()).toStrictEqual("array | object | string | number |");
	});
});
