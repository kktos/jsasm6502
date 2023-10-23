import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { readHexLine } from "../src/pragmas/data.pragma";
import { opts } from "./shared/options";

describe("Macro", () => {
	it("tests that labels work with expanded macro", () => {
		const src = `
			.macro test a,x,y
				lda.w a
				ldx.w x
				ldy.w y
			.end

			start:
				nop
				test 1,2,3
			end:
				nop
				jmp start
				jmp end
				.out .hex(start)," ", .hex(end)
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(opts.output.trim()).toStrictEqual("$1000 $100A");
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("EA AD 01 00 AE 02 00 AC 03 00 EA 4C 00 10 4C 0A 10"),
		);
	});

	it("tests macro with strings", () => {
		const src = `
			.macro log fmt, parm1
				.db $42,$FF
				.cstr fmt
				.db 1
				.dw parm1
			.end

			mem:
			log "ABCD", mem
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("42 FF 41 42 43 44 00 01 00 10"),
		);
	});

	it("tests macro with variable numbers of params", () => {
		const src = `
			.macro toto id, ...parms
				.dw id
				.repeat .len(parms) idx
				.dw parms[idx]
				.end
			.end
			toto $CAFE, "ABCD", $1234
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("FE CA 41 00 42 00 43 00 44 00 34 12"),
		);
	});

	it("tests macro with label", () => {
		const src = `
			.macro read_file filename
				.dw filename
			.end

				read_file fwelcome
				rts

			fwelcome
				.cstr "ABCD"
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("03 10 60 41 42 43 44 00"),
		);
	});
});
