import type { ScalarToken } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { SymbolValue } from "../symbol.class";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class SegmentDirective implements IDirective {
	public handlePassOne(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		const tokens = assembler.getInstructionTokens();
		if (tokens.length === 0) throw new Error(`ERROR on line ${directive.line}: .SEGMENT requires a name expression.`);

		let name: SymbolValue;
		if (tokens.length === 1 && tokens[0].type === "IDENTIFIER") name = tokens[0].value;
		else name = assembler.expressionEvaluator.evaluate(tokens, context);
		if (typeof name !== "string") throw new Error(`ERROR on line ${directive.line}: .SEGMENT name must evaluate to a string.`);

		if (assembler.peekToken()?.type === "LBRACE") {
			const params = this.parseBlockParameters(assembler, context, directive.line);

			if (params.start === undefined || params.end === undefined)
				throw new Error(`ERROR on line ${directive.line}: .SEGMENT definition requires 'start' and 'end' parameters.`);

			const start = params.start;
			const end = params.end;
			const pad = params.pad;

			const size = end - start + 1;
			if (size <= 0) throw new Error(`ERROR on line ${directive.line}: .SEGMENT 'end' address must be greater than or equal to 'start' address.`);

			assembler.addSegment(name, start, size, pad);
			assembler.logger.log(`[PASS 1] Defined segment: ${name} from $${start.toString(16)} to $${end.toString(16)}`);
		}
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		const tokens = assembler.getInstructionTokens();
		if (tokens.length === 0) throw new Error(`ERROR on line ${directive.line}: .SEGMENT requires a name expression.`);

		let name: SymbolValue;
		if (tokens.length === 1 && tokens[0].type === "IDENTIFIER") name = tokens[0].value;
		else name = assembler.expressionEvaluator.evaluate(tokens, context);
		if (typeof name !== "string") throw new Error(`ERROR on line ${directive.line}: .SEGMENT name must evaluate to a string.`);

		// If it was a definition, the segment was already added in pass one.
		if (assembler.peekToken()?.type === "LBRACE") {
			assembler.getDirectiveBlockTokens("");
			return;
		}

		assembler.useSegment(name);
		assembler.logger.log(`[PASS 2] Using segment: ${name}`);
	}

	private parseBlockParameters(assembler: Assembler, context: DirectiveContext, line: number | string): { start: number; end?: number; pad?: number } {
		const params: { start: number; end?: number; pad?: number } = { start: 0 };

		assembler.consume();

		while (true) {
			const token = assembler.nextToken();
			if (!token) break;
			if (token.type === "RBRACE") break;

			if (token.type !== "LABEL") throw new Error(`.SEGMENT definition syntax error on line ${line}: key:value`);

			const key = token.value.toLowerCase();
			if (key !== "start" && key !== "end" && key !== "pad") throw new Error(`.SEGMENT definition syntax error on line ${line}: unknown property ${key}`);

			const valueTokens = assembler.getExpressionTokens();
			params[key] = assembler.expressionEvaluator.evaluateAsNumber(valueTokens, context);

			if (assembler.peekToken()?.type === "COMMA") assembler.consume();
		}

		return params;
	}
}
