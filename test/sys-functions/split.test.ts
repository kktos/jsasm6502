import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../../src/lib/assembler";
import { opts } from "../shared/options";

describe("Split function", () => {
	beforeEach(() => {
		opts.output = "";
		opts.listing= true;
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

	it("tests split a non string", () => {
		const src = `
			arr= .split(10, ",")
			.echo arr, " TYPE:", .type(arr)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toMatch(/^SPLIT: First parameter should be a string/);
	});

	it("tests split string on a non string", () => {
		const src = `
			arr= .split("one,two", 0)
			.echo arr, " TYPE:", .type(arr)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toMatch(/^SPLIT: Second parameter should be a string/);
	});

	it("tests split with define", () => {
		const src = `
			.define str
			this is a string
			.end
			arr= .split(str)
			.echo arr, " TYPE:", .type(arr)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual(`["this","is","a","string"] TYPE:array`);
	});

});
