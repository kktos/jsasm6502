import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../../src/lib/assembler";
import { opts } from "../shared/options";

describe("IIF function", () => {
	beforeEach(() => {
		opts.output = "";
		opts.listing= true;
	});

	it("tests len with the wrong parm count", () => {
		const src = `
			addr = $1000
			.echo .iif(addr>$1000, "one", "two")
			.echo .iif(addr=$1000, "one", "two")
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output).toStrictEqual([
			"two",
			"one",
			""
		].join("\n"));
	});

	it("tests len with the wrong parm count", () => {
		const src = `
			.echo .iif("toto", "one", "two")
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(`IIF: Parameter should be a number =0 or !=0  - "string = "toto""`);
	});

});
