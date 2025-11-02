import { describe, expect, it } from "vitest";

import { assemble } from "../src/lib/assembler";
import { opts } from "./shared/options";

describe("Symbols", () => {

	it("tests that global symbols and function symbols are properly dumped", () => {
		const src = `
			mainPrg = $800
			.org $1200
			main
				lda #10
				jsr animConanJump
				rts
			.function animConanJump {
				loop
					lda #10
					bne loop
				end
					rts
			}
		`;
		const asmRes = assemble({name:"main.asm", content: src}, opts);
		expect(asmRes).toBeDefined();

		const expected= [
			'GLOBAL:',
			'  ANIMCONANJUMP(): number = $1206 ; "main.asm":8',
			'    END: number = $120A ; "main.asm":4',
			'    LOOP: number = $1206 ; "main.asm":1',
			'  MAIN: number = $1200 ; "main.asm":4',
			'  MAINPRG: number = $800 ; "main.asm":2',
			''
		].join("\n");

		expect(asmRes.symbols.dump().symbols).toStrictEqual(expected);
	});

});
