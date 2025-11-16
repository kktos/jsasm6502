import * as console from "node:console";

/** The possible types for a symbol's value. */
export type SymbolValue = number | string | (string | number)[];

/** Represents a defined symbol (label or constant). */
interface PASymbol {
	name: string;
	value: SymbolValue;
	isGlobal: boolean;
	namespace: string;
}

export class PASymbolTable {
	// Map: namespace -> symbol_name -> PASymbol
	private symbols: Map<string, Map<string, PASymbol>> = new Map();
	private scopeStack: string[] = [];
	private scopeCounter = 0;

	constructor(initialNamespace = "__GLOBAL__") {
		this.scopeStack.push(initialNamespace);
		this.symbols.set(initialNamespace, new Map());
	}

	/** Pushes a new scope onto the stack, making it the current scope. */
	pushScope(name?: string): void {
		const newScopeName = name || `__LOCAL_${this.scopeCounter++}__`;
		this.scopeStack.push(newScopeName);
		if (!this.symbols.has(newScopeName)) {
			this.symbols.set(newScopeName, new Map());
		}
	}

	/** Pops the current scope from the stack, returning to the parent scope. */
	popScope(): void {
		if (this.scopeStack.length > 1) {
			const oldScopeName = this.scopeStack.pop()!;
			this.symbols.delete(oldScopeName); // Clean up symbols from the popped scope
		}
	}

	/** Changes the current active namespace. */
	setNamespace(name: string): void {
		// This method is now less relevant for hierarchical scopes but can be used to switch top-level contexts.
		this.scopeStack = [name || "__GLOBAL__"];
		if (!this.symbols.has(this.scopeStack[0])) {
			this.symbols.set(this.scopeStack[0], new Map());
		}
	}

	/** Retrieves the current active namespace. */
	getCurrentNamespace(): string {
		return this.scopeStack[this.scopeStack.length - 1];
	}

	/**
	 * Adds a symbol (label or constant). Handles local labels starting with '.'
	 * @param name The symbol name.
	 * @param value The resolved address or value.
	 * @param isConstant If true, it's a constant (SYMBOL_DEF), not an address/label.
	 */
	addSymbol(name: string, value: SymbolValue, isConstant = false): void {
		const namespace = this.getCurrentNamespace();

		// Local labels start with a dot (e.g., '.loop')
		const isLocal = name.startsWith(".");
		if (isLocal) {
			// Local labels are scoped to the current active global/named scope
			// For simplicity, we'll store them under the current namespace.
			// A more complex assembler would track the last global label for local scope.
		}

		const scope = this.symbols.get(namespace);

		if (!scope) {
			throw `[PASS 1] ERROR: PASymbol ${namespace} doesn't exist.`;
		}

		if (scope.has(name)) {
			throw `[PASS 1] ERROR: PASymbol ${namespace}::${name} redefined.`;
		}

		scope.set(name, {
			name,
			value,
			isGlobal: !isLocal,
			namespace,
		});

		console.log(`[PASS 1] Defined symbol: ${namespace}::${name} = ${value}`);
	}

	/**
	 * Defines or updates a symbol in the *current* scope.
	 * This is ideal for loop iterators or re-assignable variables.
	 * @param name The symbol name.
	 * @param value The value to assign.
	 * @param isGlobal In the context of a local scope, this is always false.
	 */
	define(name: string, value: SymbolValue, isGlobal = false): void {
		const scopeName = this.getCurrentNamespace();
		const scope = this.symbols.get(scopeName);
		if (!scope) {
			throw new Error(`[SymbolTable] ERROR: Current scope '${scopeName}' does not exist.`);
		}
		scope.set(name, { name, value, isGlobal, namespace: scopeName });
	}

	setSymbol(name: string, value: SymbolValue): void {
		// Search up the scope stack to find the symbol.
		for (let i = this.scopeStack.length - 1; i >= 0; i--) {
			const scopeName = this.scopeStack[i];
			const scope = this.symbols.get(scopeName);
			if (scope?.has(name)) {
				const symbol = scope.get(name)!;
				symbol.value = value;
				return;
			}
		}

		// If we get here, the symbol was not found in any active scope.
		const currentScope = this.getCurrentNamespace();
		throw new Error(`[SymbolTable] Attempted to set value for undefined symbol '${name}' in scope '${currentScope}'.`);
	}

	/**
	 * Attempts to look up a symbol. Searches current namespace first, then global.
	 */
	lookupSymbol(name: string): SymbolValue | undefined {
		// 1. Search from the current scope up to the global scope.
		for (let i = this.scopeStack.length - 1; i >= 0; i--) {
			const scopeName = this.scopeStack[i];
			const scope = this.symbols.get(scopeName);
			if (scope?.has(name)) {
				return scope.get(name)!.value;
			}
		}

		// 2. Handle namespaced lookup (TOTO::LABEL)
		if (name.includes("::")) {
			const [ns, symName] = name.split("::");
			const targetScope = this.symbols.get(ns);
			if (targetScope?.has(symName)) {
				return targetScope.get(symName)!.value;
			}
		}

		return undefined;
	}
}
