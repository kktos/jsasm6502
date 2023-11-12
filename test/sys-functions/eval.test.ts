import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../../src/lib/assembler";
import { opts } from "../shared/options";

describe("Eval function", () => {
	beforeEach(() => {
		opts.output = "";
		opts.listing= true;
	});

	it("tests eval with a string", () => {
		const src = `
			count= .array(1,2,3)
			str= ".len(count)"
			.echo .eval(str)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("3");
	});

	it("tests eval with a non string", () => {
		const src = `
		str= 45
		.echo .eval(str)
`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toMatch(/^EVAL: Parameter should be a string/);
	});

});
