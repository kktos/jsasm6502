import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { opts } from "./shared/options";

describe("Numbers", () => {

	beforeEach(() => {
		opts.output= "";
		opts.listing= true;
	});

	it("should get a value $ hexa number", () => {
		const src = `
			.log $45
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("69");
	});

	it("should get a value 0x hexa number", () => {
		const src = `
			.log 0x45
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("69");
	});

	it("should get a value base10 number", () => {
		const src = `
			.log 45
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("45");
	});

	it("should get a value 0b binary number", () => {
		const src = `
			.log 0b10101010
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("170");
	});

	it("should get a value % binary number", () => {
		const src = `
			.log %10101010
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("170");
	});

	it("should get a value % binary number with separators", () => {
		const src = `
			.log %1010_1010
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("170");
	});

	it("should get a value $ hexa number with separators", () => {
		const src = `
			.log $AA_AA
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("170");
	});

});
