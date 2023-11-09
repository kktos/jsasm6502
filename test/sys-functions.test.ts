import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { opts } from "./shared/options";

// opts.readFile= (filename, fromFile, asBin) => {
// 	if (filename === "inc1")
// 		return { path: "", content: ".namespace two\nlda #count", error:"" };

// 	return { path: "", content: filename, error:"" };
// };

describe("Function", () => {
	beforeEach(() => {
		opts.output = "";
		opts.listing= true;
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
		.lst on
		.log .type(arr)
		.log .type(obj)
		.log .type("one")
		.log .type(1)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual([
			"array",
			"object",
			"string",
			"number",
	].join("\n"));
	});

	it("tests split string on default (space)", () => {
		const src = `
			arr= .split("one two")
			.echo arr, " TYPE:", .type(arr)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual(`["one","two"] TYPE:array`);
	});

	it("tests split string on comma (,)", () => {
		const src = `
			arr= .split("one,two", ",")
			.echo arr, " TYPE:", .type(arr)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual(`["one","two"] TYPE:array`);
	});

});
