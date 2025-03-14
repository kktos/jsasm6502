import { describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { readHexLine } from "../src/lib/pragmas/data.pragma";
import { opts } from "./shared/options";

describe("Function", () => {

	it("tests access to external label from a function", () => {
		const src = `
		counter
			.db 00
		.function clearByte2
			lda counter
		.end function
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.error).toBeNull();
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("00 AD 00 10")
			);
	});

	it("tests we can't access a label in a function", () => {
		const src = `
		.function clearByte3
		counter
			.db 00
		.end function
			lda counter
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.error).toStrictEqual([
			'IDENTIFIER : Unknown identifier "COUNTER" in GLOBAL',
			// 'But "COUNTER" exists in CLEARBYTE',
		].join("\n"));
	});

	it("tests we can't access a function label", () => {
		const src = `
		.namespace screen
		.function clear
		counter
			.db 00
			lda counter
		.end function
			lda clear.counter
		.end namespace
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.error).toStrictEqual([
			"IDENTIFIER : Labels inside a function can't be access",
		].join("\n"));
	});

	it("tests a function call", () => {
		const src = `
			jmp start
		.function print
			rts
		.end
		.end
		start
			jsr print
			rts
		`;
		const asmRes = assemble({name:"testFnCall", content: src}, opts);
		expect(asmRes.error).toStrictEqual('IDENTIFIER : Unknown identifier "START" in GLOBAL');

	});

	it("tests that locals are seen before others", () => {
		const src = `
		counter
			.db 00
			.function clearByte2 {
				counter
					.db 00
				lda counter
			}
			lda counter
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.error).toBeNull();
		expect(asmRes.obj.CODE).toStrictEqual(
			readHexLine("00 00 AD 01 10 AD 00 10")
			);
	});

	it("tests we can't have duplicate functions", () => {
		const src = `
		.function clearByte2 {
			counter
				.db 00
			lda counter
		}
		.function clearByte2 {
			counter
				.db 00
			lda counter
		}
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.error).toStrictEqual("Duplicate function CLEARBYTE2 in GLOBAL");
	});

	it("tests we can't have nested functions", () => {
		const src = `
		.function clearByte2 {
			counter
				.db 00
			lda counter
			.function forbiddenFn {
				counter
					.db 00
				lda counter
			}
		}
		`;
		const asmRes = assemble(src, opts);
		expect(asmRes.error).toStrictEqual("BLOCK: Missing end block }");
	});
});

