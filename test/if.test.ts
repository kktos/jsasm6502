import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { opts } from "./shared/options";
import { readHexLine } from "../src/lib/pragmas/data.pragma";
import { hexDump } from "../src/lib/helpers/utils";

describe("If", () => {

	beforeEach(()=> {
		opts.output= "";
		opts.listing= true;
	});

	it.skip("should deal with label defined after", () => {
		const src = `
		.if loadLevel
			.out "loadLevel : ",.hex(loadLevel)
		.end
		loadLevel	lda $10
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("loadLevel : $1000");
		expect(hexDump(asmRes.obj.CODE)).toStrictEqual([
			"A5 10"
		].join("\n"));
	});

	it.skip("should work with C-like block as {} - same line", () => {
		const src = `
		.if level { b = "B"
			.out "level : ", level, " : ", b
		}
		level= 10
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("level : 10 : B");
	});

	it.skip("should work with C-like block as {} - next line", () => {
		const src = `
		.if level
		{
			.out "level : ", level
		}

		.else {
			.out "ERROR !"
		}
		toto= 0
		level= 10
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("level : 10");
	});

	it.skip("should work with C-like block IF/ELSE - ELSE", () => {
		const src = `
		level= 10
		.if level<10 {
			.out "low level"
		} .else {
			.out "high level"
		}
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("high level");
	});

	it.skip("should work with C-like block IF/ELSE - IF", () => {
		const src = `
		level= 6
		.if level<10 {
			.out "low level"
		} .else {
			.out "high level"
		}
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("low level");
	});

	it.skip("should work with C-like block embedded", () => {
		const src = `
		level= 6
		count=5
		msg= ""
		.if level<10 {
			.if count<3 {
				msg = msg + "extremely "
			}
			.else {
				msg = msg + "very "
			}
			.out msg + "low level"
		}
		.else {
			.out "high level"
		}
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("very low level");
	});

	it("should work with C-like block mixed", () => {
		const src = `
		level= 6
		count= 2
		msg= ""
		.if level<10 { ; this comment should not raise an error
			.if count<3
				msg = msg + "extremely "
			.else
				msg = msg + "very "
			.end
			.out msg + "low level"
		}
		.else {
			.out "high level"
		}
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("extremely low level");
	});

	it.skip("should work with C-like block mixed ELSE", () => {
		const src = `
		level= 11
		count= 2
		msg= ""
		.if level<10 {
			.if count<3
				msg = msg + "extremely "
			.else
				msg = msg + "very "
			.end
			.out msg + "low level"
		} .else {            ; this comment should not raise an error
			.out "high level"
		}
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("high level");
	});

	it.skip("should raise error with C-like block IF", () => {
		const src = `
		level= 11
		count= 2
		msg= ""
		.if level<10 { count= 2  ; <- should raise an error
			.if count<3
				msg = msg + "extremely "
			.else
				msg = msg + "very "
			.end
			.out msg + "low level"
		} .else {
			.out "high level"
		}
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual("BLOCK: Start block { should be the last on the line");
	});

	it.skip("should raise error with C-like block IF", () => {
		const src = `
		level= 11
		count= 2
		msg= ""
		.if level<10 {
			.if count<3
				msg = msg + "extremely "
			.else
				msg = msg + "very "
			.end
			.out msg + "low level"
		} .else {  count= 2        ; <- should raise an error
			.out "high level"
		}
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual("BLOCK: Start block { should be the last on the line");
	});

	it.skip("should raise error if expression is not a number", () => {
		const src = `
		.if "string" {
			.out "wont be run"
		}
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual("IF: Need a number; 0 (false) or not 0 (true)");
	});

});
