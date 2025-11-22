import type { ScalarToken } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class DefineDirective implements IDirective {
	public handlePassOne(directive: ScalarToken, assembler: Assembler, _context: DirectiveContext) {
		// In Pass 1, we just define the symbol with a placeholder value (0).
		// The real value will be calculated in Pass 2. This ensures that
		// forward references to this symbol can be resolved without error,
		// even if they won't have the correct value until the second pass.

		const symbolNameToken = assembler.nextIdentifierToken();
		if (!symbolNameToken) throw new Error(`'.DEFINE' directive on line ${directive.line} requires a symbol name.`);

		// Define with a placeholder
		if (assembler.symbolTable.lookupSymbol(symbolNameToken.value) === undefined) {
			assembler.symbolTable.addSymbol(symbolNameToken.value, 0);
		}

		assembler.nextToken({ endMarker: ".END" });
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, _context: DirectiveContext) {
		// 1. Parse the directive arguments: .DEFINE <symbolName> <handlerName>
		const symbolNameToken = assembler.nextIdentifierToken();
		if (!symbolNameToken) throw new Error(`'.DEFINE' directive on line ${directive.line} requires a symbol name.`);

		// const handlerNameToken = assembler.nextIdentifierToken();
		// if (!handlerNameToken) throw new Error(`'.DEFINE' directive on line ${directive.line} requires a handler name.`);

		// 2. Get the handler function from assembler options
		// const handler = assembler.defineSymbolHandlers?.get(handlerNameToken.value.toUpperCase());
		// if (!handler)
		// 	throw new Error(`Unknown .DEFINE handler '${handlerNameToken.value}' on line ${handlerNameToken.line}. Did you provide it in AssemblerOptions?`);

		// 3. Extract the raw block content
		const blockToken = assembler.nextToken({ endMarker: ".END" });

		// Join the raw text of the tokens inside the block.
		// const blockContent = blockTokens.map((t) => t.raw ?? t.value).join("");
		const blockContent = (blockToken?.value as string) ?? "";

		// 4. Call the external handler function with the block content

		const value = blockContent; //handler(blockContent, context);

		// 5. Set the symbol's value to the result
		assembler.symbolTable.setSymbol(symbolNameToken.value, value);
		// assembler.logger.log(`[PASS 2] Defined symbol ${symbolNameToken.value} via .DEFINE handler '${handlerNameToken.value}'.`);
	}
}
