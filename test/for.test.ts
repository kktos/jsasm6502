import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { beforeEach } from "node:test";
import { opts } from "./shared/options";
import { readHexLine } from "../src/pragmas/data.pragma";

describe("FOR PRAGMA", () => {
	beforeEach(() => {
		opts.output = "";
	});


	it("should iterate of an array of number", () => {
		const src = `
		.define addrList
		[0, $100, $200, $300]
		.end

		.for idx of addrList
			lda $0400 + idx, x
		.end

		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("BD 00 04 BD 00 05 BD 00 06 BD 00 07"));
	});

	it("should iterate of an array of string", () => {
		const src = `
		.define colours
		["blue", "green", "red"]
		.end

		.for colour of colours
			.echo "colour is "+colour
		.end

		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(opts.output.trim()).toStrictEqual([
			"colour is blue",
			"colour is green",
			"colour is red",
		].join("\n"));
	});

});
