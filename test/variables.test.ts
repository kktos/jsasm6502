import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { opts } from "./shared/options";

describe("Variables", () => {
	beforeEach(() => {
		opts.output = "";
	});

	it("sets var value", () => {
		const src = "var_dummy= 10*2\n.out var_dummy";
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(opts.output.trim()).toStrictEqual("20");
	});

	it("adds 2 vars value", () => {
		const src = `
				var_spriteIdx= 10*2
				test= 19
				.out test+var_spriteIdx
			`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(opts.output.trim()).toStrictEqual("39");
	});

	it("namespaces", () => {
		const src = `
				var_spriteIdx= 10*2
				label2 = $100
				.namespace test
				label_in_test= $DECA
			`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(asmRes.symbols.dump()).toStrictEqual([
		"GLOBAL:",
		'  LABEL2: number = $100 ; "":3',
		'  VAR_SPRITEIDX: number = $14 ; "":2',
		"TEST:",
		'  LABEL_IN_TEST: number = $DECA ; "":5',
		""
		].join("\n"));

	});
});
