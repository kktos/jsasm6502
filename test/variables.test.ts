import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler.js";

let output = "";

const opts = {
	readFile: (filename, fromFile, asBin) => ({ path: "", content: filename }),
	YAMLparse: () => "",
	listing: false,
	segments: null,
	console: {
		log: (s) => {
			output += `${s}\n`;
		},
		error: (s) => {
			output += `${s}\n`;
		},
		warn: (s) => {
			output += `${s}\n`;
		},
	},
};

describe("Variables", () => {
	it("sets var value", () => {
		const src = "var_spriteIdx= 10*2\n.out var_spriteIdx";
		output = "";
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(output.trim()).toStrictEqual("20");
	});

	it("adds 2 vars value", () => {
		const src = `
				var_spriteIdx= 10*2
				test= 9
				.out test+var_spriteIdx
			`;
		output = "";
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(output.trim()).toStrictEqual("29");
	});

	it("namespaces", () => {
		const src = `
				var_spriteIdx= 10*2
				label2 = $100
				.namespace test
				test= 9
			`;
		output = "";
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();

		expect(asmRes.symbols.namespaces).toHaveProperty("GLOBAL");
		expect(asmRes.symbols.global).toHaveProperty("VAR_SPRITEIDX");
		expect(asmRes.symbols.global).toHaveProperty("LABEL2");
		expect(asmRes.symbols.global).not.toHaveProperty("TEST");

		expect(asmRes.symbols.namespaces).toHaveProperty("TEST");
		expect(asmRes.symbols.namespaces.TEST).not.toHaveProperty("VAR_SPRITEIDX");
		expect(asmRes.symbols.namespaces.TEST).not.toHaveProperty("LABEL2");
		expect(asmRes.symbols.namespaces.TEST).toHaveProperty("TEST");
	});
});
