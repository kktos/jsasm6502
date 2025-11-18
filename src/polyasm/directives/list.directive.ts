import { type IDirective, type DirectiveContext, ADVANCE_TO_NEXT_LINE } from "./directive.interface";
import type { Logger } from "../logger";
import type { Assembler } from "../polyasm";

export class ListDirective implements IDirective {
	private readonly logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	public handlePassOne(assembler: Assembler, context: DirectiveContext): number {
		this.setListing(assembler, context);
		return ADVANCE_TO_NEXT_LINE;
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): number {
		this.setListing(assembler, context);
		return ADVANCE_TO_NEXT_LINE;
	}

	private setListing(assembler: Assembler, context: DirectiveContext): void {
		const { token, tokenIndex } = context;
		const argTokens = assembler.getInstructionTokens(tokenIndex + 1);
		const mode = argTokens[0]?.value?.toUpperCase();

		if (mode === "ON") this.logger.enabled = true;
		else if (mode === "OFF") this.logger.enabled = false;
		else this.logger.warn(`[LIST] Invalid .LIST mode '${mode}' on line ${token.line}. Expected ON or OFF.`);
	}
}
