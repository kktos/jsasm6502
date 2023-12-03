import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../../src/lib/assembler";
import { opts } from "../shared/options";

describe("function .pop()", () => {

	beforeEach(()=>{
		opts.output= "";
		opts.listing= true;
	});

	it("tests pop last array item", () => {
		const src = `
			list= .array(1, 2, 3)

			last= .pop(list)

			.log .type(list), " : ", list, " : ", last
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("array : [$1,$2] : 3");
	});

	it("tests pop on non array", () => {
		const src = `
			list= ""
			last= .pop(list)
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toMatch("POP: First Parameter should be an array");
	});

	it("tests pop on an empty array", () => {
		const src = `
			list= .array()
			last= .pop(list)
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual("POP: no value to pop");
	});

});
