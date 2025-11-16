/**
 * handler.ts
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
import type { Assembler } from "../polyasm";
import type { DirectiveContext } from "./directive.interface";

export class DirectiveHandler {
	private readonly assembler: Assembler;
	private readonly directiveMap: Map<string, IDirective>;

	constructor(assembler: Assembler) {
		this.assembler = assembler;
		this.directiveMap = new Map();

		// Register all directive handlers
		this.register(".ORG", new OrgDirective());
		this.register(".INCLUDE", new IncludeDirective());
		this.register(".INCBIN", new IncbinDirective());
		this.register(".NAMESPACE", new NamespaceDirective());
		this.register(".DB", new DataDirective(1)); // Define Byte (1 byte)
		this.register(".DW", new DataDirective(2)); // Define Word (2 bytes)
		this.register(".DL", new DataDirective(4)); // Define Long (4 bytes)
		this.register(".MACRO", new MacroDirective());

		const conditionalHandler = new ConditionalDirective(); // This instance will now hold the conditional state
		this.register(".IF", conditionalHandler);
		this.register(".ELSEIF", conditionalHandler);
		this.register(".ELSE", conditionalHandler);
		this.register(".END", conditionalHandler);

		const loopHandler = new LoopDirective();
		this.register(".FOR", loopHandler);
		this.register(".REPEAT", loopHandler);

		const fillHandler = new FillDirective();
		this.register(".FILL", fillHandler);
		this.register(".DS", fillHandler);
		this.register(".RES", fillHandler);
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
