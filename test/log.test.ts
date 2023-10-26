import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/assembler.js";
import { opts } from "./shared/options";

describe("log", () => {

	beforeEach(() => {
		opts.output = "";
	});

	it("tests .log string", () => {
		const src = `
		.log "test" " one"
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(opts.output.trim()).toStrictEqual("test one");
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
		expect(opts.output.trim()).toStrictEqual("array [1,2,3]");
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
		expect(opts.output.trim()).toStrictEqual(`object {"key":"value"}`);
	});

	it("tests .error", () => {
		const src = `
			.log "hello"
			.error "boom"
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(opts.output.trim()).toMatch(/^hello\n\n\nboom/m);
	});


});