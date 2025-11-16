import type { Assembler } from "../polyasm";
import type { DirectiveContext, IDirective } from "./directive.interface";
import type { Token } from "../lexer/lexer.class";

interface LoopState {
	iterator?: Token;
	itemIterator?: Token; // For .FOR loops
	items?: (string | number)[]; // For .FOR loops
	body: Token[];
	// For .REPEAT loops
	repeatCount?: number;
	repeatTotal?: number;
}

export class LoopDirective implements IDirective {
	public handlePassOne(assembler: Assembler, context: DirectiveContext): number {
		// In Pass 1, we just find the matching .END and skip the whole block.
		return assembler.findMatchingDirective(context.tokenIndex) + 1;
	}

	public handlePassTwo(assembler: Assembler, context: DirectiveContext): number {
		const startToken = context.token;
		const directive = startToken.value.toUpperCase();

		if (directive === ".FOR") {
			return this.handleForLoop(assembler, context);
		}

		if (directive === ".REPEAT") {
			return this.handleRepeatLoop(assembler, context);
		}

		// Handle .REPEAT or other loop types here in the future
		return context.tokenIndex + 1; // Default skip
	}

	// A map to store the state of active loops between iterations. Key: A unique identifier for the loop.
	private loopStates: Map<string, LoopState> = new Map();

	private handleForLoop(assembler: Assembler, context: DirectiveContext): number {
		const tokens = assembler.activeTokens;
		const { token: startToken, tokenIndex: startIndex, evaluationContext } = context;

		// 1. Parse the .for <iterator> of <array> syntax
		const itemIteratorToken = tokens[startIndex + 1];
		const ofToken = tokens[startIndex + 2];

		if (itemIteratorToken?.type !== "IDENTIFIER" || ofToken?.value.toUpperCase() !== "OF") {
			throw new Error(`Invalid .FOR loop syntax on line ${startToken.line}. Expected: .for <iterator> of <array>`);
		}

		// Manually find the end of the expression and check for an optional 'AS' clause
		let expressionStartIndex = startIndex + 3;
		let expressionEndIndex = expressionStartIndex;
		while (
			expressionEndIndex + 1 < tokens.length &&
			tokens[expressionEndIndex + 1].line === startToken.line &&
			tokens[expressionEndIndex + 1].value?.toUpperCase() !== "AS"
		) {
			expressionEndIndex++;
		}
		const expressionTokens = tokens.slice(expressionStartIndex, expressionEndIndex + 1);

		let indexIteratorToken: Token | undefined;
		if (tokens[expressionEndIndex + 1]?.value.toUpperCase() === "AS") {
			indexIteratorToken = tokens[expressionEndIndex + 2];
		}

		// 2. Resolve the array from the symbol table
		const arrayValue = assembler.expressionEvaluator.evaluate(expressionTokens, evaluationContext);
		if (!Array.isArray(arrayValue)) {
			throw new Error(`The expression in the .FOR loop on line ${startToken.line} did not evaluate to an array.`);
		}

		// 3. Find the loop body
		const endTokenIndex = assembler.findMatchingDirective(startIndex);
		const bodyTokens = tokens.slice(assembler.skipToEndOfLine(startIndex), endTokenIndex);

		if (arrayValue.length === 0) {
			// Empty array, do nothing.
			return endTokenIndex + 1;
		}

		// 4. Create a local scope for the entire loop's duration.
		assembler.symbolTable.pushScope();

		// 5. Store the complete state for the loop.
		const loopId = `${startToken.line}`; // Use line number as a unique ID for the loop.
		this.loopStates.set(loopId, {
			itemIterator: itemIteratorToken,
			iterator: indexIteratorToken, // The index iterator
			items: arrayValue,
			repeatCount: arrayValue.length,
			repeatTotal: arrayValue.length,
			body: bodyTokens,
		});

		// 6. Set the main stream's index past the entire .for...end block.
		const nextIndex = endTokenIndex + 1;
		assembler.currentTokenIndex = nextIndex;

		// 7. Kick off the first iteration.
		this.runNextLoopIteration(assembler, loopId);

		// 8. Return the new index. The passTwo loop will see a new stream was pushed and correctly start it at index 0.
		return nextIndex;
	}

	private handleRepeatLoop(assembler: Assembler, context: DirectiveContext): number {
		const tokens = assembler.activeTokens;
		const { token: startToken, tokenIndex: startIndex, evaluationContext } = context;

		// 1. Parse the .REPEAT <count> [AS <iterator>] syntax
		let expressionEndIndex = startIndex;
		while (
			expressionEndIndex + 1 < tokens.length &&
			tokens[expressionEndIndex + 1].line === startToken.line &&
			tokens[expressionEndIndex + 1].value?.toUpperCase() !== "AS"
		) {
			expressionEndIndex++;
		}

		const countExpressionTokens = tokens.slice(startIndex + 1, expressionEndIndex + 1);
		const count = assembler.expressionEvaluator.evaluateAsNumber(countExpressionTokens, evaluationContext);

		// Check for optional 'AS iterator'
		let iteratorToken: Token | undefined;
		if (tokens[expressionEndIndex + 1]?.value.toUpperCase() === "AS") {
			iteratorToken = tokens[expressionEndIndex + 2];
		}

		// 2. Find loop body
		const endTokenIndex = assembler.findMatchingDirective(startIndex);
		const bodyTokens = tokens.slice(assembler.skipToEndOfLine(startIndex), endTokenIndex);

		if (count <= 0) return endTokenIndex + 1; // Loop zero times

		// 3. Setup scope and state
		assembler.symbolTable.pushScope();
		const loopId = `${startToken.line}`;
		this.loopStates.set(loopId, { iterator: iteratorToken, repeatCount: count, repeatTotal: count, body: bodyTokens });

		// 4. Kick off the first iteration and advance main stream
		const nextIndex = endTokenIndex + 1;
		assembler.currentTokenIndex = nextIndex;
		this.runNextLoopIteration(assembler, loopId);
		return nextIndex;
	}

	private onLoopBodyEnd(assembler: Assembler, loopId: string): void {
		// When one iteration finishes, simply try to run the next one.
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
		assembler.emitter.once(`endOfStream:${streamId}`, () => this.onLoopBodyEnd(assembler, loopId));
		assembler.pushTokenStream(body, undefined, streamId);
	}

	private endLoop(assembler: Assembler, loopId: string): void {
		assembler.symbolTable.popScope();
		this.loopStates.delete(loopId);
	}
}
