import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../../src/lib/assembler";
import { opts } from "../shared/options";

describe("Type function", () => {
	beforeEach(() => {
		opts.output = "";
		opts.listing= true;
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

});
