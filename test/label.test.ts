import { describe, expect, it } from "vitest";

import { assemble } from "../src/assembler";
import { opts } from "./shared/options";

describe("Label", () => {

	it("should detect duplicate labels", () => {
		const src = `
			lda #0
			beq exit
			ldx #3
		exit
			ldy #0
		exit
			rts
		`;
		let asmRes;
		expect(() => asmRes === assemble(src, opts)).toThrowError("Duplicate Symbol : EXIT");
	});

});
