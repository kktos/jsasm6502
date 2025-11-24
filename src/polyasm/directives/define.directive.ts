import type { ScalarToken } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { DataProcessor } from "../polyasm.types";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class DefineDirective implements IDirective {
	public handlePassOne(directive: ScalarToken, assembler: Assembler, _context: DirectiveContext) {
		const symbolNameToken = assembler.nextIdentifierToken();
		if (!symbolNameToken) throw new Error(`'.DEFINE' directive on line ${directive.line} requires a symbol name.`);

		let token = assembler.peekTokenUnbuffered();
		if (token?.type === "IDENTIFIER" && token.value === "AS") {
			assembler.consume();
			token = assembler.nextIdentifierToken();
			if (!token) throw new Error(`'.DEFINE' directive on line ${directive.line} requires a Data Processor name.`);
			const processor = assembler.getDataProcessor(token?.value);
			if (!processor) throw new Error(`'.DEFINE' directive on line ${directive.line}; unknown Data Processor '${token.value}'.`);
		}

		assembler.symbolTable.addSymbol(symbolNameToken.value, 0);

		assembler.nextToken({ endMarker: ".END" });
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		// Parse the directive arguments: .DEFINE <symbolName> <handlerName>
		const symbolNameToken = assembler.nextIdentifierToken();
		if (!symbolNameToken) throw new Error(`'.DEFINE' directive on line ${directive.line} requires a symbol name.`);

		let processor: DataProcessor | undefined;
		let token = assembler.peekTokenUnbuffered();
		if (token?.type === "IDENTIFIER" && token.value === "AS") {
			assembler.consume();
			token = assembler.nextIdentifierToken();
			if (!token) throw new Error(`'.DEFINE' directive on line ${directive.line} requires a Data Processor name.`);
			processor = assembler.getDataProcessor(token?.value);
			if (!processor) throw new Error(`'.DEFINE' directive on line ${directive.line}; unknown Data Processor '${token.value}'.`);
		}

		// Extract the raw block content
		const blockToken = assembler.nextToken({ endMarker: ".END" });

		// Join the raw text of the tokens inside the block.
		const blockContent = (blockToken?.value as string) ?? "";

		// Call the external handler function with the block content

		const value = processor ? processor(blockContent, context) : blockContent;

		// Set the symbol's value to the result
		assembler.symbolTable.setSymbol(symbolNameToken.value, value);

		// assembler.logger.log(`[PASS 2] Defined symbol ${symbolNameToken.value} via .DEFINE handler '${handlerNameToken.value}'.`);
	}
}
