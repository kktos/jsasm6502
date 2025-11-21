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
import type { ScalarToken } from "../lexer/lexer.class";
import { LogDirective } from "./log.directive";

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

		const logHandler = new LogDirective("LOG");
		this.register(".LOG", logHandler);
		this.register(".ECHO", logHandler);
		this.register(".OUT", logHandler);

		const errLogHandler = new LogDirective("ERR");
		this.register(".ERROR", errLogHandler);
		this.register(".ERR", errLogHandler);

		const warnLogHandler = new LogDirective("WARN");
		this.register(".WARNING", warnLogHandler);
		this.register(".WARN", warnLogHandler);

		const fillHandler = new FillDirective();
		this.register(".FILL", fillHandler);
		this.register(".DS", fillHandler);
		this.register(".RES", fillHandler);

		this.register(".ALIGN", new AlignDirective());
	}

	private register(name: string, handler: IDirective): void {
		this.directiveMap.set(name, handler);
	}

	public handlePassOneDirective(directive: ScalarToken, context: DirectiveContext) {
		const handler = this.directiveMap.get(directive.value);
		if (handler) {
			handler.handlePassOne(directive, this.assembler, context);
			// const result = handler.handlePassOne(directive, this.assembler, context);
			// If handler returned undefined, assume it managed the assembler position itself
			// if (result === undefined) return this.assembler.getPosition();
			// return result;
		}
		// Default: advance one token from provided context index if available, otherwise use assembler position + 1
		// if (typeof context.tokenIndex === "number") return context.tokenIndex + 1;
		return this.assembler.getPosition() + 1;
	}

	public handlePassTwoDirective(directive: ScalarToken, context: DirectiveContext) {
		// const handler = this.directiveMap.get(String(context.token.value).toUpperCase());
		const handler = this.directiveMap.get(directive.value);
		if (handler) {
			handler.handlePassTwo(directive, this.assembler, context);
			// const result = handler.handlePassTwo(directive, this.assembler, context);
			// if (result === undefined) return this.assembler.getPosition();
			// return result;
		}
		// if (typeof context.tokenIndex === "number") return context.tokenIndex + 1;
		return this.assembler.getPosition() + 1;
	}
}
