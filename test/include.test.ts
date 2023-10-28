import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { readHexLine } from "../src/pragmas/data.pragma";
import { opts } from "./shared/options";

opts.readFile= (filename, fromFile, asBin) => {
	if (filename === "inc1")
		return { path: "", dir:"inc1", content: ".namespace two\nlda #count", error:"" };

	return { path: "", dir:"", content: filename, error:"" };
},

describe("Include", () => {
	it("get exported value from included file", () => {
		const src = `
			.namespace one
			count= 2
			.include "inc1"
			.namespace one
			.export count
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 02"));
	});

});
