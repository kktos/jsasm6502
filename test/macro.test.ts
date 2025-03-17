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

	it("tests a c-like macro with no parameters", () => {
		const src = `
			.macro nopnopnop {
				nop
				nop
				nop
			}

			start:
				nopnopnop
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("EA EA EA"),
		);
	});

	it("tests a macro with no parameters", () => {
		const src = `
			.macro nopnopnop
				nop
				nop
				nop
			.end

			start:
				nopnopnop
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("EA EA EA"),
		);
	});

	it("tests a macro with extra parameters", () => {
		const src = `
			.macro nopnopnop
				nop
				nop
				nop
			.end

			start:
				nopnopnop 98
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual("MACRO: Syntax Error; Extra/Unknown parameter");
	});

	it("tests a macro with extra parameters", () => {
		const src = `
			.macro test
				nop
				nop
				nop
			.end

			start:
				test()
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("EA EA EA"),
		);
	});

	it("tests that labels work with expanded macro", () => {
		const src = `
			.macro test a,x,y {
				lda.w a
				ldx.w x
				ldy.w y
			}

			start:
				nop
				test 1,2,3
			end:
				nop
				jmp start ; should compute once macro is expanded
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
			.macro toto(id, ...parms) {
				.dw id
				.repeat .len(parms) idx
					.if .type(parms[idx]) = "string"
						.cstr parms[idx]
					.else
						.dw parms[idx]
					.end
				.end
			}
			toto($CAFE, "ABCD", $1234)
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
			.macro read_file(filename)
				.dw filename
			.end

				read_file(fwelcome)
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

	it("tests expanded macro in listing", () => {
		const src = `
			.macro read_file filename
				; WDM disk_read_file
				.db $42, $11
				.dw filename

		!		bit $C0FF
				bpl !-
			.end

			read_file fwelcome
			rts
			fwelcome	.cstr 'WELCOME'
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);

		const output= [
				"                                  			.macro read_file filename",
				"                                  			read_file fwelcome",
				"1000:  42 11                      				.db $42, $11",
				"1002:  0A 10                      				.dw filename",
				"1004:  2C FF C0                   		!		bit $C0FF",
				"1007:  10 FB                      				bpl !-",
				"1009:  60                         			rts",
				"100A:  57 45 4C 43 4F 4D  WELCOM  			fwelcome	.cstr 'WELCOME'",
				"1010:  45 00              E.",
				""
		].join("\n");

		expect(asmRes.disasm[0].content).toStrictEqual(output);
	});

	it("tests expanded C-like macro in listing", () => {
		const src = `
			.macro read_file filename {
				; WDM disk_read_file
				.db $42, $11
				.dw filename

		!		bit $C0FF
				bpl !-
			}

			read_file fwelcome
			rts
			fwelcome	.cstr 'WELCOME'
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.error).toStrictEqual(null);

		const output= [
				"                                  			.macro read_file filename {",
				"                                  			read_file fwelcome",
				"1000:  42 11                      				.db $42, $11",
				"1002:  0A 10                      				.dw filename",
				"1004:  2C FF C0                   		!		bit $C0FF",
				"1007:  10 FB                      				bpl !-",
				"1009:  60                         			rts",
				"100A:  57 45 4C 43 4F 4D  WELCOM  			fwelcome	.cstr 'WELCOME'",
				"1010:  45 00              E.",
				""
		].join("\n");

		expect(asmRes.disasm[0].content).toStrictEqual(output);
	});
});
