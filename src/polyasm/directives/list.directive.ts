import type { ScalarToken } from "../lexer/lexer.class";
import type { Logger } from "../logger";
import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class ListDirective implements IDirective {
	private readonly logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	public handlePassOne(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		this.setListing(directive, assembler, context);
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		this.setListing(directive, assembler, context);
	}

	private setListing(directive: ScalarToken, assembler: Assembler, _context: DirectiveContext): void {
		const argsToken = assembler.parser.getInstructionTokens();

		if (argsToken.length !== 1) {
			this.logger.warn(`[LIST] Invalid .LIST syntax on line ${directive.line}. Expected ON or OFF.`);
			return;
		}

		const mode = argsToken[0].value;

		switch (mode) {
			case "ON":
				this.logger.enabled = true;
				break;
			case "OFF":
				this.logger.enabled = false;
				break;
			default:
				this.logger.warn(`[LIST] Invalid .LIST mode '${mode}' on line ${directive.line}. Expected ON or OFF.`);
		}
	}
}
