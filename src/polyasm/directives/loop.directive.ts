import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";
import type { IdentifierToken, ScalarToken, Token } from "../lexer/lexer.class";
import type { SymbolValue } from "../symbol.class";

interface LoopState {
	iterator?: IdentifierToken;
	itemIterator?: IdentifierToken; // For .FOR loops
	// items?: (string | number)[]; // For .FOR loops
	items?: SymbolValue[]; // For .FOR loops
	body: Token[];
	// For .REPEAT loops
	repeatCount?: number;
	repeatTotal?: number;
}

export class LoopDirective implements IDirective {
	public handlePassOne(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		assembler.skipToDirectiveEnd(directive.value);
		return undefined;
	}

	public handlePassTwo(directive: ScalarToken, assembler: Assembler, context: DirectiveContext) {
		if (directive.value === ".FOR") {
			this.handleForLoop(directive, assembler);
			return undefined;
		}

		if (directive.value === ".REPEAT") {
			this.handleRepeatLoop(directive, assembler);
			return undefined;
		}

		throw new Error(`Invalid directive ${directive.value} on line ${directive.line}.`);
	}

	// A map to store the state of active loops between iterations. Key: A unique identifier for the loop.
	private loopStates: Map<string, LoopState> = new Map();

	private handleForLoop(directive: ScalarToken, assembler: Assembler): void {
		// 1. Parse the .for <iterator> of <array> syntax using buffered access
		const itemIteratorToken = assembler.nextIdentifierToken();
		const ofToken = assembler.nextIdentifierToken("OF");

		if (!itemIteratorToken || !ofToken) throw new Error(`Invalid .FOR loop syntax on line ${directive.line}. Expected: .for <iterator> of <array>`);

		// Find expression tokens on the header line after 'OF', optionally followed by 'AS'
		const exprHeader = assembler.getInstructionTokens();
		let asIndex = exprHeader.findIndex((t) => t.type === "IDENTIFIER" && t.value === "AS");
		if (asIndex === -1) asIndex = exprHeader.length;
		const expressionTokens = exprHeader.slice(0, asIndex);
		const indexIteratorToken = asIndex < exprHeader.length ? (exprHeader[asIndex + 1] as IdentifierToken) : undefined;

		// 2. Resolve the array from the symbol table
		const evaluationContext = {
			pc: assembler.currentPC,
			macroArgs: assembler.tokenStreamStack[assembler.tokenStreamStack.length - 1]?.macroArgs,
			assembler,
			currentGlobalLabel: assembler.getLastGlobalLabel?.() ?? undefined,
			options: assembler.options,
		};

		const arrayValue = assembler.expressionEvaluator.evaluate(expressionTokens, evaluationContext);
		if (!Array.isArray(arrayValue)) throw new Error(`The expression in the .FOR loop on line ${directive.line} did not evaluate to an array.`);

		// 3. Find the loop body
		const startIndex = assembler.getPosition();
		const endTokenIndex = assembler.skipToDirectiveEnd(directive.value);
		const bodyTokens = assembler.sliceTokens(startIndex, endTokenIndex);

		if (arrayValue.length === 0) {
			// Empty array, advance past block
			assembler.setPosition(endTokenIndex + 1);
			return;
		}

		// 4. Create a local scope for the entire loop's duration.
		assembler.symbolTable.pushScope();

		// 5. Store the complete state for the loop.
		const loopId = `${directive.line}`; // Use line number as a unique ID for the loop.
		this.loopStates.set(loopId, {
			itemIterator: itemIteratorToken,
			iterator: indexIteratorToken, // The index iterator
			items: arrayValue as SymbolValue[],
			repeatCount: arrayValue.length,
			repeatTotal: arrayValue.length,
			body: bodyTokens,
		});

		// 6. Advance main stream past the .for...end block.
		// const nextIndex = endTokenIndex + 1;
		// assembler.setPosition(nextIndex);

		// 7. Kick off the first iteration.
		this.runNextLoopIteration(assembler, loopId);

		// Handler manages position itself (void return)
	}

	private handleRepeatLoop(directive: ScalarToken, assembler: Assembler): void {
		// Parse count expression tokens on the header line
		// const headerTokens = assembler.getInstructionTokens();
		const countExpressionTokens = assembler.getInstructionTokens();
		// const countExpressionTokens = headerTokens.slice(1);
		// If there is an 'AS' clause, split it
		const asPos = countExpressionTokens.findIndex((t) => t.type === "IDENTIFIER" && t.value === "AS");
		let iteratorToken: IdentifierToken | undefined;
		const exprTokens = asPos === -1 ? countExpressionTokens : countExpressionTokens.slice(0, asPos);
		if (asPos !== -1) iteratorToken = countExpressionTokens[asPos + 1] as IdentifierToken;

		const evaluationContext = {
			pc: assembler.currentPC,
			macroArgs: assembler.tokenStreamStack[assembler.tokenStreamStack.length - 1]?.macroArgs,
			assembler,
			currentGlobalLabel: assembler.getLastGlobalLabel?.() ?? undefined,
			options: assembler.options,
		};

		const count = assembler.expressionEvaluator.evaluateAsNumber(exprTokens, evaluationContext);

		// 2. Find loop body
		const startIndex = assembler.getPosition();
		const endTokenIndex = assembler.skipToDirectiveEnd(directive.value);
		const bodyTokens = assembler.sliceTokens(startIndex, endTokenIndex);

		if (count <= 0) throw new Error("Repeat count must be a positive integer.");

		// 3. Setup scope and state
		assembler.symbolTable.pushScope();
		const loopId = `${directive.line}`;
		this.loopStates.set(loopId, {
			iterator: iteratorToken,
			repeatCount: count,
			repeatTotal: count,
			body: bodyTokens,
		});

		// 4. Advance main stream and kick off iteration
		// const nextIndex = endTokenIndex + 1;
		// assembler.setPosition(nextIndex);
		this.runNextLoopIteration(assembler, loopId);
	}

	private runNextLoopIteration(assembler: Assembler, loopId: string): void {
		const state = this.loopStates.get(loopId);
		if (!state) return; // Should not happen

		// Unified loop handling for .FOR and .REPEAT
		if (state.repeatCount !== undefined && state.repeatCount > 0) {
			// Calculate an incrementing 0-based index for the current iteration
			const currentIndex = (state.repeatTotal ?? 0) - state.repeatCount;
			state.repeatCount--; // Decrement remaining count for the next call

			// Define the main iterator variable (0-based index for .FOR, 1-based for .REPEAT)
			if (state.iterator) {
				const iteratorValue = state.items ? currentIndex : currentIndex + 1;
				assembler.symbolTable.define(state.iterator.value, iteratorValue, false);
			}

			// Handle .FOR specific item value
			if (state.items && state.itemIterator) {
				const currentItem = state.items[currentIndex];
				assembler.symbolTable.define(state.itemIterator.value, currentItem, false);
			}

			this.pushLoopBody(assembler, loopId, state.body);
		} else {
			// No iterations left, end the loop.
			this.endLoop(assembler, loopId);
		}
	}

	private pushLoopBody(assembler: Assembler, loopId: string, body: Token[]): void {
		const streamId = assembler.getNextStreamId();
		assembler.emitter.once(`endOfStream:${streamId}`, () => this.runNextLoopIteration(assembler, loopId));
		assembler.pushTokenStream(body, undefined, streamId);
	}

	private endLoop(assembler: Assembler, loopId: string): void {
		assembler.symbolTable.popScope();
		this.loopStates.delete(loopId);
	}
}
