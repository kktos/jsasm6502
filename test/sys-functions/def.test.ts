import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../../src/lib/assembler";
import { opts } from "../shared/options";

describe("Def/Undef function", () => {
	beforeEach(() => {
		opts.output = "";
		opts.listing= true;
	});

	it("tests def with undefined label name", () => {
		const src = `
			.echo .def("label")
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("0");
	});

	it("tests undef with undefined label name", () => {
		const src = `
			.echo .undef("label")
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("1");
	});

	it("tests def with label name in namespace", () => {
		const src = `
			.namespace boot
			label = $45
			.end namespace

			.echo .def("boot.label"), " - ", .def("boot.unknown")
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("1 - 0");
	});

	it("tests def with undefined label", () => {
		const src = `
			.echo .def(label)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("0");
	});

	it("tests def with defined label", () => {
		const src = `
			label = *
			.echo .def(label)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("1");
	});

	it("tests def with label in namespace", () => {
		const src = `
			.namespace boot
			label = $45
			.end namespace

			.echo .def(boot.label), " - ", .def(boot.unknown)
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("1 - 0");
	});

});
