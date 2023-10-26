import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { beforeEach } from "node:test";
import { opts } from "./shared/options";
import { readHexLine } from "../src/pragmas/data.pragma";

describe("FOR PRAGMA", () => {
	beforeEach(() => {
		opts.output = "";
	});

	it("should not iterate of an empty array", () => {
		const src = `
		.define list
		[]
		.end

		.for idx of list
			.echo idx
		.end

		.echo .len(list)
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(opts.output.trim()).toStrictEqual("0");

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
		opts.output = "";
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
		].join("\n\n"));
	});

	it("should iterate of an array of object", () => {
		const src = `
		.define colours
		- color: blue
		- color: green
		- color: red
		.end

		.for item of colours
			.echo "colour is "+item.color
		.end

		`;

		opts.output= "";

		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(opts.output.trim()).toStrictEqual([
			"colour is blue",
			"colour is green",
			"colour is red",
		].join("\n\n"));
	});

	it("should handle nest FOR loop", () => {
		const src = `
		.define colours
		["blue", "green", "red"]
		.end

		.define nums
		[1,2,3,4]
		.end

		.for idx of nums
			str= ""
			.for colour of colours
				str= str + colour + ","
			.end
			.echo idx+":"+str
		.end

		`;

		opts.output= "";

		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(opts.output.trim()).toStrictEqual([
			"1:blue,green,red,",
			"2:blue,green,red,",
			"3:blue,green,red,",
			"4:blue,green,red,",
		].join("\n\n"));
	});

});