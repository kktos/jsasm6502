import type { ScalarToken } from "../lexer/lexer.class";
import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";

export class LogDirective implements IDirective {
	constructor(private mode: "LOG" | "ERR" | "WARN" = "LOG") {}

	public handlePassOne(directive: ScalarToken, assembler: Assembler, context: DirectiveContext): void {
		this.handle(directive, assembler, {
			...context,
			allowForwardRef: context.allowForwardRef ?? true,
		});
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, context: DirectiveContext): void {
		this.handle(directive, assembler, {
			...context,
			allowForwardRef: context.allowForwardRef ?? false,
		});
	}

	private handle(directive: ScalarToken, assembler: Assembler, context: DirectiveContext & { allowForwardRef?: boolean }): void {
		// Retrieve tokens on the same line after the directive
		const tokens = assembler.parser.getInstructionTokens(directive);

		// Split tokens into comma-separated expressions, but respect nested
		// parentheses/brackets/braces so commas inside arrays or function calls
		// don't split top-level directive arguments.
		const exprs: (typeof tokens)[] = [];
		let currentExpr: typeof tokens = [];
		let parenDepth = 0;
		let bracketDepth = 0;
		let braceDepth = 0;

		for (const t of tokens) {
			// Update nesting depths before deciding about commas
			if (t.value === "(") parenDepth++;
			else if (t.value === ")") parenDepth = Math.max(0, parenDepth - 1);
			else if (t.value === "[") bracketDepth++;
			else if (t.value === "]") bracketDepth = Math.max(0, bracketDepth - 1);
			else if (t.value === "{") braceDepth++;
			else if (t.value === "}") braceDepth = Math.max(0, braceDepth - 1);

			const atTopLevel = parenDepth === 0 && bracketDepth === 0 && braceDepth === 0;

			if (t.type === "COMMA" && atTopLevel) {
				exprs.push(currentExpr);
				currentExpr = [];
			} else currentExpr.push(t);
		}
		if (currentExpr.length > 0) exprs.push(currentExpr);

		if (exprs.length === 0) {
			// Nothing to log
			this.emitLog(assembler, `.LOG on line ${directive.line}:`);
			return;
		}

		const outputs: string[] = [];

		for (const exprTokens of exprs) {
			// try {
			const value = assembler.expressionEvaluator.evaluate(exprTokens, {
				pc: context.pc,
				assembler: assembler,
				allowForwardRef: context.allowForwardRef ?? false,
				macroArgs: context.macroArgs,
				currentGlobalLabel: context.currentGlobalLabel,
				options: context.options,
			});

			outputs.push(this.formatValue(value));
			// } catch (e) {
			// 	assembler.logger.error(`[LOG] ERROR on line ${directive.line}: ${e}`);
			// 	outputs.push("<ERROR>");
			// }
		}

		this.emitLog(assembler, outputs.join("\t"));
	}

	private formatValue(value: unknown): string {
		if (Array.isArray(value)) return `[${value.map((v) => this.formatValue(v)).join(", ")}]`;
		return String(value);
	}

	private emitLog(assembler: Assembler, message: string): void {
		switch (this.mode) {
			case "ERR":
				throw new Error(`[ERROR] ${message}`);
			case "WARN":
				assembler.logger.warn(message);
				break;
			default:
				assembler.logger.log(message);
		}
	}
}
