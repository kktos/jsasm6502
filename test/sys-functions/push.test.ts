import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../../src/lib/assembler";
import { opts } from "../shared/options";

describe("function .push()", () => {

	beforeEach(()=>{
		opts.output= "";
		opts.listing= true;
	});

	it("tests define array with function .array()", () => {
		const src = `
			list= .array(1, 2, 3)

			;list.push(5)

			.log .type(list), " : ",list
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("array : [$1,$2,$3]");
	});

});
