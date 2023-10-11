import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/assembler.js";
import { load } from "../src/helpers/asm-yaml/index.js";

let output = "";

const opts = {
	readFile: (filename, fromFile, asBin) => {
		return { path: "", content: filename };
	},
	YAMLparse: (s) =>load(s),
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

describe("log", () => {

	beforeEach(() => {
		output = "";
	});

	it("tests .log string", () => {
		const src = `
		.log "test" " one"
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(output.trim()).toStrictEqual("test one");
	});

	it("tests .log array", () => {
		const src = `
			.define charmap_apple
				[
					0x01, 0x02, 0x03
				]
			.end
			.log .type(charmap_apple) " " charmap_apple
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(output.trim()).toStrictEqual("array [1,2,3]");
	});

	it("tests .log object", () => {
		const src = `
			.define obj
				key: value
			.end
			.log .type(obj) " " obj
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(output.trim()).toStrictEqual(`object {"key":"value"}`);
	});


});
