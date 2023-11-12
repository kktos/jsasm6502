import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../../src/lib/assembler";
import { opts } from "../shared/options";

describe("Hex function", () => {
	beforeEach(() => {
		opts.output = "";
		opts.listing= true;
	});

	it("tests hex with a 4bits number", () => {
		const src = `
			count= $7
			.echo .hex(count)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("$07");
	});

	it("tests hex with a 8bits number", () => {
		const src = `
			count= $97
			.echo .hex(count)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("$97");
	});

	it("tests hex with a 12bits number", () => {
		const src = `
			count= $197
			.echo .hex(count)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("$0197");
	});

	it("tests hex with a 16bits number", () => {
		const src = `
			count= $A197
			.echo .hex(count)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("$A197");
	});

	it("tests hex with a min length", () => {
		const src = `
			count= $7
			.echo .hex(count, 1)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("$7");
	});

	it("tests hex with a min length with big number", () => {
		const src = `
			count= $A5B7
			.echo .hex(count, 1)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("$A5B7");
	});

	it("tests hex with a big min length with small number", () => {
		const src = `
			count= $AA
			.echo .hex(count, 6)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("$0000AA");
	});

	it("tests hex with wrong 1st parameter", () => {
		const src = `
			count= "this is a string"
			.echo .hex(count)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toMatch("HEX: Parameter should be a number");
	});

	it("tests hex with wrong 2nd parameter", () => {
		const src = `
			count= $AA
			.echo .hex(count, "wrongType")
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toMatch("HEX: Second parameter should be a number");
	});

});
