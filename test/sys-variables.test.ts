import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { opts } from "./shared/options";

describe("System Variables", () => {
	beforeEach(() => {
		opts.output = "";
		opts.listing = true;
	});

	it("should return the CPU selected", () => {
		const src = `
			.cpu "6502"

			.if .cpu = "6502"
			  .echo "6502", " ", .cpu
			.else
			  .echo "NOT 6502", " ", .cpu
			.end

			.cpu "65C02"

			.if .cpu = "6502"
			  .echo "6502", " ", .cpu
			.else
			  .echo "NOT 6502", " ", .cpu
			.end

		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);

		expect(opts.output.trim()).toStrictEqual([
			"6502 6502",
			"NOT 6502 65C02"
		].join("\n"));
	});

	it("should return the current segment", () => {
		const src = `
		  .echo .segment.name," ",.segment.start," ",.segment.end," ",.segment.size
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);

		expect(opts.output.trim()).toStrictEqual([
			"CODE",
			0x1000.toString(10),
			0xFFFF.toString(10),
			(0xFFFF - 0x1000 + 1).toString(10),
		].join(" "));
	});

	it("should return the current segment name", () => {
		const src = `
		  .echo .segmentname
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);

		expect(opts.output.trim()).toStrictEqual([
			"CODE",
		].join("\n"));
	});

	it("should return the current segment start", () => {
		const src = `
		  .echo .SEGMENTSTART
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);

		expect(opts.output.trim()).toStrictEqual([
			0x1000.toString(10),
		].join("\n"));
	});

	it("should return the current segment end", () => {
		const src = `
		  .echo .SEGMENTEND
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);

		expect(opts.output.trim()).toStrictEqual([
			0xFFFF.toString(10),
		].join("\n"));
	});

	it("should return the current segment size", () => {
		const src = `
		  .echo .SEGMENTSIZE
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);

		expect(opts.output.trim()).toStrictEqual([
			(0xFFFF - 0x1000 + 1).toString(10),
		].join("\n"));
	});

	it("should return the current namespace", () => {
		const src = `
		  .echo .namespace
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);

		expect(opts.output.trim()).toStrictEqual([
			"GLOBAL",
		].join("\n"));
	});

	it("should return the current program counter", () => {
		const src = `
		  .echo *," ",.pc
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);

		expect(opts.output.trim()).toStrictEqual([
			`${0x1000.toString(10)} ${0x1000.toString(10)}`,
		].join("\n"));
	});

});
