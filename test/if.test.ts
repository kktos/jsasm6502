import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { opts } from "./shared/options";
import { readHexLine } from "../src/lib/pragmas/data.pragma";

describe("If", () => {

	beforeEach(()=> {
		opts.output= "";
		opts.listing= true;
	});

	it("should deal with label defined after", () => {
		const src = `
		.if loadLevel
			.out "loadLevel : ",.hex(loadLevel)
		.end
		loadLevel	lda $10
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("loadLevel : $1000");
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A5 10"));
	});

	it("should work with C-like block as {}", () => {
		const src = `
		.if level {
			.out "level : ", level
		}
		level= 10
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("level : 10");
	});

	it("should work with C-like block IF", () => {
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

	it("should work with C-like block ELSE", () => {
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

	it("should work with C-like block embedded", () => {
		const src = `
		level= 6
		count=5
		msg= ""
		.if level<10 {
			.if count<3 {
				msg = msg + "extremely "
			} .else {
				msg = msg + "very "
			}
			.out msg + "low level"
		} .else {
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
		} .else {
			.out "high level"
		}
		`;
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual(null);
		expect(opts.output.trim()).toStrictEqual("extremely low level");
	});

	it("should work with C-like block mixed ELSE", () => {
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

	it("should raise error with C-like block IF", () => {
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

	it("should raise error with C-like block IF", () => {
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

});
