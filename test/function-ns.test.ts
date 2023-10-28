import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { readHexLine } from "../src/pragmas/data.pragma";
import { opts } from "./shared/options";

describe("Function & Namespace", () => {

	it("tests a call to a namespace from a function", () => {
		const src = `
			.namespace utils

			print
				rts

			.end namespace

			.function print
			jsr utils.print
			lda #<utils.print
			ldx #>utils.print
			.end
		`;
		const asmRes = assemble({name:"nsFromFn", content:src}, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("60 20 00 10 A9 00 A2 10")
			);

	});

});
