/**
 * handler.ts
 *
 * * Defines the logic for handling assembler directives during different passes.
 * * Acts as a dispatcher to specialized directive handlers.
 */

import type { IDirective } from "./directive.interface";
import { OrgDirective } from "./org.directive";
import { IncludeDirective } from "./include.directive"; // Not in context, but assumed to exist
import { IncbinDirective } from "./incbin.directive";
import { NamespaceDirective } from "./namespace.directive";
import { ConditionalDirective } from "./conditional.directive";
import { DataDirective } from "./data.directive";
import { MacroDirective } from "./macro/macro.directive";
import { LoopDirective } from "./loop.directive";
import { FillDirective } from "./fill.directive";
import { AlignDirective } from "./align.directive";
import { HexDirective } from "./hex.directive";
import type { Assembler } from "../polyasm";
import { StringDirective } from "./string.directive";
import type { DirectiveContext } from "./directive.interface";
import { OptionDirective } from "./option.directive";
import type { Logger } from "../logger";
import { ListDirective } from "./list.directive";

export class DirectiveHandler {
	private readonly directiveMap: Map<string, IDirective>;

	constructor(
		private readonly assembler: Assembler,
		private readonly logger: Logger,
	) {
		this.assembler = assembler;
		this.directiveMap = new Map();

		this.register(".ORG", new OrgDirective());
		this.register(".NAMESPACE", new NamespaceDirective());
		this.register(".MACRO", new MacroDirective());

		this.register(".OPTION", new OptionDirective());

		this.register(".INCLUDE", new IncludeDirective());
		this.register(".INCBIN", new IncbinDirective());

		this.register(".DB", new DataDirective(1)); // Define Byte (1 byte)
		this.register(".BYTE", new DataDirective(1)); // Define Byte (1 byte)
		this.register(".DW", new DataDirective(2)); // Define Word (2 bytes)
		this.register(".WORD", new DataDirective(2)); // Define Word (2 bytes)
		this.register(".DL", new DataDirective(4)); // Define Long (4 bytes)
		this.register(".LONG", new DataDirective(4)); // Define Long (4 bytes)
		this.register(".HEX", new HexDirective());

		this.register(".TEXT", new StringDirective("TEXT"));
		const cstrHandler = new StringDirective("CSTR");
		this.register(".CSTR", cstrHandler);
		this.register(".CSTRING", cstrHandler);
		this.register(".ASCIIZ", cstrHandler);
		this.register(".PSTR", new StringDirective("PSTR"));
		this.register(".PSTRL", new StringDirective("PSTRL"));

		const conditionalHandler = new ConditionalDirective();
		this.register(".IF", conditionalHandler);
		this.register(".ELSEIF", conditionalHandler);
		this.register(".ELSE", conditionalHandler);
		this.register(".END", conditionalHandler);

		const loopHandler = new LoopDirective();
		this.register(".FOR", loopHandler);
		this.register(".REPEAT", loopHandler);

		this.register(".LIST", new ListDirective(logger));

		const fillHandler = new FillDirective();
		this.register(".FILL", fillHandler);
		this.register(".DS", fillHandler);
		this.register(".RES", fillHandler);

		this.register(".ALIGN", new AlignDirective());
	}

	private register(name: string, handler: IDirective): void {
		this.directiveMap.set(name, handler);
	}

	public handlePassOneDirective(context: DirectiveContext): number {
		const handler = this.directiveMap.get(context.token.value.toUpperCase());
		if (handler) {
			return handler.handlePassOne(this.assembler, context);
		}
		return context.tokenIndex + 1; // Default behavior for unknown directives
	}

	public handlePassTwoDirective(context: DirectiveContext): number {
		const handler = this.directiveMap.get(context.token.value.toUpperCase());
		if (handler) {
			return handler.handlePassTwo(this.assembler, context);
		}
		return context.tokenIndex + 1; // Default behavior for unknown directives
	}
}
