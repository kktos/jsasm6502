import { describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { readHexLine } from "../src/lib/pragmas/data.pragma";
import { opts } from "./shared/options";


describe("Opcodes Address Size", () => {
	it("assembles JMP ($32) as 16bits addr", () => {
		const src = "jmp ($32)";
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("6C 32 00"));
	});

	it("assembles LDA.w $0012 as 16bits addr", () => {
		const src = "LDA.w $0012";
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("AD 12 00"));
	});

	it("assembles LDA.w $0012,x as 16bits addr", () => {
		const src = "LDA.w $0012,x";
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("BD 12 00"));
	});

	it("assembles LDA.w $0012,y as 16bits addr", () => {
		const src = "LDA.w $0012,y";
		const asmRes = assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("B9 12 00"));
	});

	it("cannot assemble LDA.b $1234 as 8bits addr", () => {
		const src = "LDA.b $1234";
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual("OPCODE: IAM4 Invalid Address Mode for Opcode LDA 8");
	});

	it("cannot assemble JMP.b (addr) as 8bits addr", () => {
		const src = "jmp.b ($32)";
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual("OPCODE: IAM2 Invalid Address Mode for Opcode JMP");
	});

	it("cannot assemble JMP.b ($1232,x) as 8bits addr", () => {
		const src = "jmp.b ($1232,x)";
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual("OPCODE: IAM2 Invalid Address Mode for Opcode JMP");
	});

	it("cannot assemble LDA.b ($1232,x) as 8bits addr", () => {
		const src = "lda.b ($1232,x)";
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual("OPCODE: IAM2 Invalid Address Mode for Opcode LDA");
	});

	it("cannot assemble LDA.w ($1232,x) as 16bits addr", () => {
		const src = "lda.w ($1232,x)";
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual("OPCODE: IAM2 Invalid Address Mode for Opcode LDA");
	});

	it("cannot assemble LDA ($1232),y as 16bits addr", () => {
		const src = "lda ($1232),y";
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual("OPCODE: IAM2 Invalid Address Mode for Opcode LDA");
	});

	it("cannot assemble LDA.b $1232,x as 8bits addr", () => {
		const src = "lda.b $1232,x";
		const asmRes= assemble(src, opts);
		expect(asmRes.error).toStrictEqual("OPCODE: IAM4 Invalid Address Mode for Opcode LDA 8");
	});
});
