import { beforeEach, describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { readHexLine } from "../src/lib/pragmas/data.pragma";
import { opts } from "./shared/options";
import { hexDump } from "../src/lib/helpers/utils";

describe("Macro", () => {

	beforeEach(() => {
		opts.output= "";
		opts.listing= true;
	});

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
		expect(asmRes.error).toStrictEqual(null);
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
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("42 FF 41 42 43 44 00 01 00 10"),
		);
	});

	it("tests macro with variable numbers of params", () => {
		const src = `
			.macro toto id, ...parms
				.dw id
				.repeat .len(parms) idx
					.if .type(parms[idx]) = "string"
						.cstr parms[idx]
					.else
						.dw parms[idx]
					.end
				.end
			.end
			toto $CAFE, "ABCD", $1234
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(hexDump(asmRes.obj.CODE)).toStrictEqual(
			hexDump(readHexLine("FE CA 41 42 43 44 00 34 12")),
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
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("03 10 60 41 42 43 44 00"),
		);
	});

	it("tests duplicate macro isn't possible", () => {
		const src = `
			.macro read_file filename
				.dw filename
			.end

			.macro read_file filename
				.dw filename
			.end

		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual('MACRO: "READ_FILE" is already defined');
	});

	it("tests macro with label as args", () => {
		const src = `
		spriteX = $1000

		.macro ifx ...parms
		    parmIdx= 0

		    .if .len(parms)=4
		      ldx parms[parmIdx]
			  parmIdx= parmIdx + 1
		    .end

			op= parms[parmIdx]
			value= parms[parmIdx+1]
			goto= parms[parmIdx+2]

		    .if op="<"
		      cpx #value
		      bcc goto
		    .end

		    .if op=">"
		      cpx #value
		      beq :+
		      bcs goto
		      :
		    .end
		.end

		ifx spriteX, "<", 130, $1050
		ifx ">", 208, $1050
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(opts.output.trim()).toStrictEqual("");
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("AE 00 10 E0 82 90 49 E0 D0 F0 02 B0 43"),
		);
	});

	it("tests macro with interpolation 1", () => {
		const src = `
		spriteX = $1000

		.macro ifa ...parms
		    parmIdx= 0

		    .if .len(parms)=4
		      lda %(parms[parmIdx])
			  parmIdx= parmIdx + 1
		    .end

			op= parms[parmIdx]
			value= parms[parmIdx+1]
			goto= parms[parmIdx+2]

		    .if op="<"
		      cmp %(value)
		      bcc goto
		    .end

		    .if op=">"
		      cmp %(value)
		      beq :+
		      bcs goto
		      :
		    .end
		.end

		ifa "#$66", "<", "#130", next

		next
				rts
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(opts.output.trim()).toStrictEqual("");
		expect(asmRes.error).toStrictEqual(null);
		expect(hexDump(asmRes.obj.CODE,6)).toStrictEqual(
			hexDump(readHexLine("A9 66 C9 82 90 00 60"),6),
		);
	});

	it("tests macro with interpolation 2", () => {
		const src = `
		spriteX = $1000

		.macro ifx ...parms
		    .if .len(parms)!=2
				.error "Macro ifx : needs 2 params"
			.end

			.if .type(parms[0])!="string"
				.error "Macro ifx : the first parm <",parms[0],"> needs to be a string"
			.end

			expr= .split(parms[0])
			goto= parms[1]
		    parmIdx= 0

		    .if .len(expr)=3
		      ldx %(expr[parmIdx])
			  parmIdx= parmIdx + 1
		    .end

			op= expr[parmIdx]
			value= expr[parmIdx+1]

		    .if op="<"
		      cpx %(value)
		      bcc goto
		    .end

		    .if op=">"
		      cpx %(value)
		      beq :+
		      bcs goto
		      :
		    .end
		.end

		ifx "spriteX < #130", next

		nop
		nop

		next
				rts
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		// expect(opts.output.trim()).toStrictEqual("");
		expect(asmRes.error).toStrictEqual(null);
		expect(hexDump(asmRes.obj.CODE,6)).toStrictEqual(
			hexDump(readHexLine("AE 00 10 E0 82 90 02 EA EA 60"),6),
		);
	});
});
