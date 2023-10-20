import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { opts } from "./shared/options";

// opts.readFile= (filename, fromFile, asBin) => {
// 	if (filename === "inc1")
// 		return { path: "", content: ".namespace two\nlda #count", error:"" };

// 	return { path: "", content: filename, error:"" };
// };

describe("Function", () => {
	beforeEach(() => {
		opts.output = "";
	});

	it("tests a function with the wrong parm count", () => {
		const err =
			'TERM: Wrong number of parameters for function "LEN". Expected 1 Got 2';
		const src = `
			.echo .len("one","two")
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(err);
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
		assemble(src, opts);
		expect(opts.output.trim()).toStrictEqual("array\nobject\nstring\nnumber");
	});
});
