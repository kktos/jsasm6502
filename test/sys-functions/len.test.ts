import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../../src/lib/assembler";
import { opts } from "../shared/options";

describe("Len function", () => {
	beforeEach(() => {
		opts.output = "";
		opts.listing= true;
	});

	it("tests len with the wrong parm count", () => {
		const err =
			'TERM: Wrong number of parameters for function "LEN". Expected 1 Got 2';
		const src = `
			.echo .len("one","two")
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(err);
	});

	it("tests len on a string", () => {
		const src = `
			len= .len("one")
			.echo len
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("3");
	});

	it("tests len on an array", () => {
		const src = `
			.define arr
			- one
			- two
			.end
			len= .len(arr)
			.echo len
	`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("2");
	});

	it("tests len on an array", () => {
		const src = `
			len= .len(65)
			.echo len
	`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toMatch(/^LEN: Parameter should be a string/);
	});

});
