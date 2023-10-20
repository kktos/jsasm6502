import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { opts } from "./shared/options";
import { readHexLine } from "../src/pragmas/data.pragma";

describe("If", () => {

	it("should deal with label defined after", () => {
		const src = `
		.if loadLevel
		.out "loadLevel : ",.hex(loadLevel)
		.end

		loadLevel	lda $10

		`;
		const asmRes= assemble(src, opts);

		expect(opts.output.trim()).toStrictEqual("loadLevel : $1000");

		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A5 10"));
	});

});
