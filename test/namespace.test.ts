import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { readHexLine } from "../src/pragmas/data.pragma";
import { opts } from "./shared/options";

opts.readFile= (filename, fromFile, asBin) => {
	if (filename === "inc1")
		return { path: "", content: ".namespace two\nlda #count", error:"" };

	return { path: "", content: filename, error:"" };
},

describe("Namespace", () => {
	it("get exported value from included file", () => {
		const src = `
			.namespace one
			count= 2
			.include "inc1"
			.namespace one
			.export count
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("A9 02"));
	});

	it("shows nested NS work", () => {
		const src = `
			.namespace one
			.log "one=",.ns
			count= 2

			.namespace two
			.log "two=",.ns
			count= 3
			.end namespace

			.log "one=",.ns
		`;
		opts.output = "";
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(opts.output.trim()).toBe("one=ONE\ntwo=TWO\none=ONE");
	});

	it("shows nested NS have their local labels", () => {
		const src = `
			.namespace one
			count= 2
			.echo count

			.namespace two
			count= 3
			.echo count
			.end namespace

			.echo count
		`;
		opts.output = "";
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(opts.output.trim()).toBe("2\n3\n2");
	});

	it("shows nested NS have their local labels", () => {
		const src = `
			count= 9

			.namespace one
			count= 2
			totoone= "one"

			.namespace two
			count= 3
			totoone= "two"
			.end namespace

			.end namespace

		`;
		opts.output = "";
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.symbols.dump()).toBe([
			"GLOBAL:",
			'  COUNT: number = $9 ; "":2',
			"ONE:",
			'  COUNT: number = $2 ; "":5',
			'  TOTOONE: string = "one" ; "":6',
			"TWO:",
			'  COUNT: number = $3 ; "":9',
			'  TOTOONE: string = "two" ; "":10',
			""
		].join("\n"));
	});

});
