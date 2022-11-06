import { describe, expect, it } from "vitest";

import { assemble } from "../src/main.js";
import { readHexLine } from "../src/pragmas/data.pragma.js";

let output= "";

const opts= {
	readFile: (filename, fromFile, asBin) => ({path: "", content: filename}),
	YAMLparse: () => "",
	listing: false,
	segments: null,
	console: {
		log: (s) => { output+= s+"\n"; },
		error: (s) => {output+= s+"\n"; },
		warn: (s) => { output+= s+"\n"; }
	},
	cpu: "65c02"
};

describe("Opcodes Address Size", () => {

	it('assembles JMP ($32) as 16bits addr', () => {
		const src= "jmp ($32)";
		const asmRes= assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("6C 32 00"));
	});

	it('assembles LDA.w $0012 as 16bits addr', () => {
		const src= "LDA.w $0012";
		const asmRes= assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("AD 12 00"));
	});

	it('assembles LDA.w $0012,x as 16bits addr', () => {
		const src= "LDA.w $0012,x";
		const asmRes= assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("BD 12 00"));
	});

	it('assembles LDA.w $0012,y as 16bits addr', () => {
		const src= "LDA.w $0012,y";
		const asmRes= assemble(src, opts);
		expect(asmRes).toBeDefined();
		expect(asmRes.obj.CODE).toStrictEqual(readHexLine("B9 12 00"));
	});

	it('cannot assemble LDA.b $1234 as 8bits addr', () => {
		const src= "LDA.b $1234";
		let asmRes;
		expect(() => asmRes= assemble(src, opts)).toThrowError(/OPCODE: IAM4 Invalid Address Mode for Opcode LDA/);
	});

	it('cannot assemble JMP.b (addr) as 8bits addr', () => {
		const src= "jmp.b ($32)";
		let asmRes;
		expect(() => asmRes= assemble(src, opts)).toThrowError(/OPCODE: IAM2 Invalid Address Mode for Opcode JMP/);
	});

	it('cannot assemble JMP.b ($1232,x) as 8bits addr', () => {
		const src= "jmp.b ($1232,x)";
		let asmRes;
		expect(() => asmRes= assemble(src, opts)).toThrowError(/OPCODE: IAM2 Invalid Address Mode for Opcode JMP/);
	});

	it('cannot assemble LDA.b ($1232,x) as 8bits addr', () => {
		const src= "lda.b ($1232,x)";
		let asmRes;
		expect(() => asmRes= assemble(src, opts)).toThrowError(/OPCODE: IAM2 Invalid Address Mode for Opcode LDA/);
	});

	it('cannot assemble LDA.w ($1232,x) as 16bits addr', () => {
		const src= "lda.w ($1232,x)";
		let asmRes;
		expect(() => asmRes= assemble(src, opts)).toThrowError(/OPCODE: IAM2 Invalid Address Mode for Opcode LDA/);
	});

	it('cannot assemble LDA ($1232),y as 16bits addr', () => {
		const src= "lda ($1232),y";
		let asmRes;
		expect(() => asmRes= assemble(src, opts)).toThrowError(/OPCODE: IAM2 Invalid Address Mode for Opcode LDA/);
	});

	it('cannot assemble LDA.b $1232,x as 8bits addr', () => {
		const src= "lda.b $1232,x";
		let asmRes;
		expect(() => asmRes= assemble(src, opts)).toThrowError(/OPCODE: IAM4 Invalid Address Mode for Opcode LDA/);
	});


});



