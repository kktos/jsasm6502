import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../../src/lib/assembler";
import { opts } from "../shared/options";

describe("function .array()", () => {

	beforeEach(()=>{
		opts.output= "";
		opts.listing= true;
	});

	it("tests define array with macro", () => {
		const src = `
			.macro defineArray varname, ...params
				.let varname = params
			.end

			defineArray "list", 1, 2, 3

			.log .type(list), " : ",list
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("array : [$1,$2,$3]");
	});

	it("tests define array with function .array()", () => {
		const src = `
			list= .array(1, 2, 3)

			.log .type(list), " : ",list
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("array : [$1,$2,$3]");
	});

	it("tests define empty array with function .array()", () => {
		const src = `
			list= .array()

			.log .type(list), " : ",list
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("array : []");
	});

});
