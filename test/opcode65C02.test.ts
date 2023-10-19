import { beforeAll, describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { op65c02 } from "../src/opcodes/65C02.opcodes";
import { readHexLine } from "../src/pragmas/data.pragma";
import { test_65C02 } from "./test_65C02.data";
import { opts } from "./shared/options";

it("tests all instructions", () => {
	expect(Object.keys(test_65C02).length).toEqual(Object.keys(op65c02).length);
});

describe.each(Object.keys(test_65C02))("%s", (instr) => {

	beforeAll(()=> {
		opts.cpu= "65c02";
	});

	it("tests all opcodes", () => {
		expect(test_65C02[instr].length).toEqual(
			op65c02[instr].filter((v) => v >= 0).length,
		);
	});

	it.each(test_65C02[instr])("assembles %s", (src: string, bytes: any) => {
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine(bytes));
	});
});
