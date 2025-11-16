export type TokenType = "DIRECTIVE" | "LABEL" | "IDENTIFIER" | "NUMBER" | "STRING" | "OPERATOR" | "LBRACE" | "RBRACE";

export type Token = {
	type: TokenType;
	value: string;
	line: string | number;
	column: number;
};

// Regex constants for performance and clarity
const DIRECTIVE_DOT_NUMBER_REGEX = /^\.\d/;
const NUMERIC_LITERAL_REGEX = /^(\d+|\$[0-9A-Fa-f]+|%[01]+)$/i;
const OPERATOR_CHARS_REGEX = /([,()#:+\-*\/])/g;

/**
 * Minimal tokenizer for the mock environment to demonstrate decoupling.
 * FIXED: Uses replacement strategy to ensure operators (:, #, ,, etc.) are separated
 * from identifiers and literals before splitting, solving the label:instruction issue.
 */
export function tokenize(sourceContent: string): Token[] {
	const tokens: Token[] = [];
	const lines = sourceContent.split("\n");
	let currentLine = 1;

	for (const line of lines) {
		let lineWithoutComment = line;
		let inString = false;
		for (let i = 0; i < line.length; i++) {
			const char = line[i];
			if (char === '"') {
				// This is a simple toggle; it doesn't handle escaped quotes like \"
				// but is sufficient for the current assembler's capabilities.
				inString = !inString;
			}
			// A semicolon marks a comment only if we are not inside a string.
			if (char === ";" && !inString) {
				lineWithoutComment = line.substring(0, i);
				break; // The rest of the line is a comment
			}
		}

		const cleanLine = lineWithoutComment.trim();
		// If the line is now empty (it was blank or only contained a comment), skip it.
		if (cleanLine === "") {
			currentLine++;
			continue;
		}

		let col = 1;

		// 1. Isolate key syntax elements by surrounding them with spaces
		let processedLine = cleanLine;

		// Isolate assembly operators and separators
		// WARNING: Order matters! $ is isolated first to detect hex literals, not just as an operator
		// Regex to add spaces around operators, but not if they are part of a number (like '$' or '%')
		// It looks for operators and surrounds them with spaces for easy splitting.
		processedLine = processedLine.replace(OPERATOR_CHARS_REGEX, " $1 ");

		// Specifically handle '$' and '%' only if they are not followed by a hex/binary digit,
		// to avoid splitting '$' from '$1234'. This is complex, so we'll adjust the tokenizing logic instead.
		// The above regex is a good general start.

		// 2. Split by whitespace, now that delimiters are isolated
		const parts = processedLine.split(/\s+/).filter((p) => p.length > 0);

		// 3. Tokenize the parts
		for (const part of parts) {
			const value = part;
			let type: TokenType = "IDENTIFIER";

			// Directives start with a single dot and are not floating point numbers
			if (value.startsWith(".") && value.length > 1 && !DIRECTIVE_DOT_NUMBER_REGEX.test(value)) {
				type = "DIRECTIVE";
			}
			// Operators (Colon, Pound, Comma, etc.)
			else if ([":", "#", ",", "(", ")", "+", "-", "*", "/"].includes(value)) {
				type = "OPERATOR";
			}
			// Numeric literals (Hex starting with $, Decimal, or Binary starting with %)
			else if (NUMERIC_LITERAL_REGEX.test(value)) {
				type = "NUMBER";
			}
			// String literals
			else if (value.startsWith('"') && value.endsWith('"')) {
				type = "STRING";
			} else if (value === "{") {
				type = "LBRACE";
			} else if (value === "}") {
				type = "RBRACE";
			}
			// Anything else is an IDENTIFIER (label, instruction, register, etc.)
			else {
				type = "IDENTIFIER";
			}

			if (value) {
				tokens.push({
					type: type,
					value: value,
					line: currentLine,
					column: col,
				});
				col += part.length + 1;
			}
		}
		currentLine++;
	}
	return tokens;
}
