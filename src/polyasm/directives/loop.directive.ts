import type { Assembler } from "../polyasm";
import type { IDirective } from "./directive.interface";
import type { Token } from "../lexer/lexer.class";

export class LoopDirective implements IDirective {
	public handlePassOne(assembler: Assembler, tokenIndex: number): number {
		// In Pass 1, we just find the matching .END and skip the whole block.
		return assembler.findMatchingDirective(tokenIndex) + 1;
	}

	public handlePassTwo(assembler: Assembler, tokenIndex: number): number {
		const startToken = assembler.activeTokens[tokenIndex];
		const directive = startToken.value.toUpperCase();

		if (directive === ".FOR") {
			return this.handleForLoop(assembler, tokenIndex);
		}

		// Handle .REPEAT or other loop types here in the future
		return tokenIndex + 1; // Default skip
	}

	// A map to store the state of active loops between iterations.
	// Key: A unique identifier for the loop, e.g., the line number of the .FOR directive.
	private loopStates: Map<string, { iterator: Token; items: (string | number)[]; body: Token[] }> = new Map();

	constructor(private assembler: Assembler) {
		// The directive now needs a reference to the assembler to manage listeners.
	}
	private handleForLoop(assembler: Assembler, startIndex: number): number {
		const tokens = assembler.activeTokens;
		const startToken = tokens[startIndex];

		// 1. Parse the .for <iterator> of <array> syntax
		const iteratorToken = tokens[startIndex + 1];
		const ofToken = tokens[startIndex + 2];

		if (iteratorToken?.type !== "IDENTIFIER" || ofToken?.value.toUpperCase() !== "OF") {
			throw new Error(`Invalid .FOR loop syntax on line ${startToken.line}. Expected: .for <iterator> of <array>`);
		}

		const expressionStartIndex = startIndex + 3;
		const expressionTokens = assembler.getInstructionTokens(expressionStartIndex);

		// 2. Resolve the array from the symbol table
		const arrayValue = assembler.expressionEvaluator.evaluate(expressionTokens, { pc: assembler.currentPC });
		if (!Array.isArray(arrayValue)) {
			throw new Error(`The expression in the .FOR loop on line ${startToken.line} did not evaluate to an array.`);
		}

		// 3. Find the loop body
		const endTokenIndex = assembler.findMatchingDirective(startIndex);
		const bodyTokens = tokens.slice(assembler.skipToEndOfLine(startIndex), endTokenIndex);

		// 4. Get the first item and the rest of the items.
		const [firstItem, ...remainingItems] = arrayValue;

		if (firstItem === undefined) {
			// Empty array, do nothing.
			return endTokenIndex + 1;
		}

		// 5. Create a local scope and define the iterator with the first value.
		assembler.symbolTable.pushScope();
		assembler.symbolTable.define(iteratorToken.value, firstItem, false);

		// 6. Store the state for subsequent iterations.
		const loopId = `${startToken.line}`; // Use line number as a unique ID for the loop.
		this.loopStates.set(loopId, { iterator: iteratorToken, items: remainingItems, body: bodyTokens });

		// 7. Register a listener for when the loop body stream finishes.
		// The `pushTokenStream` method should return a streamId.
		const streamId = assembler.pushTokenStream(bodyTokens);
		assembler.emitter.once(`endOfStream:${streamId}`, () => this.onLoopBodyEnd(assembler, loopId));

		// 8. After setup, advance the main token stream past the entire .for...end block.
		return endTokenIndex + 1;
	}

	private onLoopBodyEnd(assembler: Assembler, loopId: string): void {
		const state = this.loopStates.get(loopId);
		if (!state) return; // Should not happen

		const [nextItem, ...remainingItems] = state.items;

		if (nextItem !== undefined) {
			// More items exist, so continue the loop.
			state.items = remainingItems; // Update state
			assembler.symbolTable.define(state.iterator.value, nextItem, false);

			const streamId = assembler.pushTokenStream(state.body);
			assembler.emitter.once(`endOfStream:${streamId}`, () => this.onLoopBodyEnd(assembler, loopId));
		} else {
			// Loop is finished, clean up.
			assembler.symbolTable.popScope();
			this.loopStates.delete(loopId);
		}
	}
}
