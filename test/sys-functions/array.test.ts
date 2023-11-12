import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../../src/lib/assembler";
import { opts } from "../shared/options";

describe("Expression", () => {

	beforeEach(()=>{
		opts.output= "";
	});

	it("tests define array with macro", () => {
		opts.listing= true;

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
		expect(opts.output.trim()).toStrictEqual(`array : [{"val":{"type":768,"value":1}},{"val":{"type":768,"value":2}},{"val":{"type":768,"value":3}}]`);
	});

	it("tests define array function .array()", () => {
		opts.listing= true;

		const src = `
			list= .array(1, 2, 3)

			.log .type(list), " : ",list
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual(`array : [{"val":{"type":768,"value":1}},{"val":{"type":768,"value":2}},{"val":{"type":768,"value":3}}]`);
	});

});
