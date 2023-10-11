import { VAExprError } from "../helpers/errors.class.js";
import { getValueType } from "../helpers/utils.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";
import { Token } from "../lexer/token.class.js";
import { getVarValue } from "../variable.js";
import {
	execFunction,
	fnFlags,
	fnParmCount,
	isFunctionExists,
} from "./function.parser.js";

const LLCHARSET = new Set([TOKEN_TYPES.MINUS, TOKEN_TYPES.PLUS]);
/*
	returns integer expression result or SE

	expr -> expr '+' term | expr '-' term | term
	term -> term '*' factor | term '/' factor | factor
	factor -> '(' expr ')' | identifier | number | '-' factor
*/
export function parseExpression(ctx, endSet, expectedType) {
	let res;
	const exprCtx = {
		...ctx,
		stack: [],
		endSet,
	};

	parseExpr(exprCtx);

	if (exprCtx.stack.length) res = evalExpr(ctx, exprCtx.stack);

	if (ctx.pass < 2) return res;

	if (expectedType && expectedType !== res.type)
		throw new VAExprError("EXPR: Invalid type");

	return res;
}

function evalExpr(ctx, stack) {
	const localStack = [];
	while (stack.length > 1) {
		let item;
		while (stack.length) {
			item = stack.shift();
			if (Array.isArray(item)) item = evalExpr(ctx, item);
			if (item.op) break;
			localStack.push(item);
		}

		// console.log("evalExpr", item.op);

		switch (item.op) {
			//
			// arithmetics
			//
			case "NEG": {
				const op1 = localStack.pop();
				if (op1.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({ type: TOKEN_TYPES.NUMBER, value: -op1.value });
				break;
			}
			case "*": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value * op2.value,
				});
				break;
			}
			case "+": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				const resType =
					op1.type === TOKEN_TYPES.NUMBER || op2.type === TOKEN_TYPES.NUMBER
						? TOKEN_TYPES.NUMBER
						: TOKEN_TYPES.STRING;
				stack.unshift({ type: resType, value: op1.value + op2.value });
				break;
			}
			case "/": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value / op2.value,
				});
				break;
			}
			case "-": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (
					ctx.pass > 1 &&
					(op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
				) {
					console.log("EXPR SUB", op1, op2);
					throw new VAExprError("Only Numbers are allowed here");
				}
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value - op2.value,
				});
				break;
			}

			//
			// comparaisons
			//
			case "<": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value < op2.value,
				});
				break;
			}
			case "<=": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value <= op2.value,
				});
				break;
			}
			case ">": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value > op2.value,
				});
				break;
			}
			case ">=": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value >= op2.value,
				});
				break;
			}
			case "=": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1.type !== op2.type) {
					const validators = [
						op1.type === TOKEN_TYPES.NUMBER && op2.type === TOKEN_TYPES.STRING,
						op1.type === TOKEN_TYPES.STRING && op2.type === TOKEN_TYPES.NUMBER,
					];
					if (!validators.some((test) => test === true))
						throw new VAExprError("Incompatible types for equality");
				}
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value === op2.value,
				});
				break;
			}
			case "!=": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1.type !== op2.type) {
					const validators = [
						op1.type === TOKEN_TYPES.NUMBER && op2.type === TOKEN_TYPES.STRING,
						op1.type === TOKEN_TYPES.STRING && op2.type === TOKEN_TYPES.NUMBER,
					];
					if (!validators.some((test) => test === true))
						throw new VAExprError("Incompatible types for inequality");
				}
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value !== op2.value,
				});
				break;
			}

			//
			// booleans
			//
			case "!": {
				const op1 = localStack.pop();
				if (op1.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({ type: TOKEN_TYPES.NUMBER, value: !op1.value });
				break;
			}
			case "AND": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value && op2.value,
				});
				break;
			}
			case "OR": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value || op2.value,
				});
				break;
			}

			//
			// bitwise
			//
			case "BAND": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value & op2.value,
				});
				break;
			}
			case "BOR": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value | op2.value,
				});
				break;
			}
			case "BXOR": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value ^ op2.value,
				});
				break;
			}

			//
			// functions
			//
			case "FN": {
				const parms = [];
				let parmCount = item.parmCount;
				while (parmCount-- && localStack.length) {
					parms.unshift(localStack.pop().value);
				}
				const res = execFunction(ctx, item.fn, parms);
				stack.unshift(res);
				break;
			}
			case "MSB": {
				const op1 = localStack.pop();
				if (ctx.pass > 1 && op1.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("MSB: Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: (op1.value >> 8) & 0xff,
				});
				break;
			}
			case "LSB": {
				const op1 = localStack.pop();
				if (ctx.pass > 1 && op1.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("LSB: Only Numbers are allowed here");
				stack.unshift({ type: TOKEN_TYPES.NUMBER, value: op1.value & 0xff });
				break;
			}

			default:
				throw new VAExprError(`Unknown operation ${item.op}`);
		}
	}

	// console.log("evalExpr", stack[0]);
	return stack[0];
}

function parseExpr(exprCtx) {
	let tok;

	// console.log(`parseExpr()`);

	parse_cmp(exprCtx);

	while (true) {
		tok = exprCtx.lexer.token();
		switch (tok.type) {
			case TOKEN_TYPES.AND:
				exprCtx.lexer.next();
				parse_cmp(exprCtx);
				exprCtx.stack.push({ op: "AND" });
				break;

			case TOKEN_TYPES.OR:
				exprCtx.lexer.next();
				parse_cmp(exprCtx);
				exprCtx.stack.push({ op: "OR" });
				break;

			default:
				// console.log("parseExpr", {stack: exprCtx.stack});
				return;
		}
	}
}

function parse_cmp(exprCtx) {

	// console.log(`parse_cmp()`);

	parse_add(exprCtx);

	// console.log("parse_cmp", {stack: exprCtx.stack});

	switch (exprCtx.lexer.token().type) {
		case TOKEN_TYPES.LOWER: {
			let op = "<";
			exprCtx.lexer.next();
			if (exprCtx.lexer.isToken(TOKEN_TYPES.EQUAL)) {
				op = "<=";
				exprCtx.lexer.next();
			}
			parse_add(exprCtx);
			exprCtx.stack.push({ op });
			break;
		}

		case TOKEN_TYPES.GREATER: {
			let op = ">";
			exprCtx.lexer.next();
			if (exprCtx.lexer.isToken(TOKEN_TYPES.EQUAL)) {
				op = ">=";
				exprCtx.lexer.next();
			}
			parse_add(exprCtx);
			exprCtx.stack.push({ op });
			break;
		}

		case TOKEN_TYPES.EQUAL:
			exprCtx.lexer.next();
			parse_add(exprCtx);
			exprCtx.stack.push({ op: "=" });
			break;

		case TOKEN_TYPES.BANG:
			if (!exprCtx.lexer.isLookahead(TOKEN_TYPES.EQUAL)) return;

			exprCtx.lexer.next();
			exprCtx.lexer.next();
			parse_add(exprCtx);
			exprCtx.stack.push({ op: "!=" });
			break;

		default:
			return;
	}
}

function parse_add(exprCtx) {
	parse_product(exprCtx);

	while (true) {
		switch (exprCtx.lexer.token().type) {
			case TOKEN_TYPES.PLUS:
				exprCtx.lexer.next();
				// parse_add(exprCtx);
				parse_product(exprCtx);
				exprCtx.stack.push({ op: "+" });
				break;
			case TOKEN_TYPES.MINUS:
				exprCtx.lexer.next();
				// parse_add(exprCtx);
				parse_product(exprCtx);
				exprCtx.stack.push({ op: "-" });
				break;
			default:
				return;
		}
	}
}

function parse_product(exprCtx) {
	parse_term(exprCtx);

	while (true) {
		switch (exprCtx.lexer.token().type) {
			case TOKEN_TYPES.STAR:
				exprCtx.lexer.next();
				parse_term(exprCtx);
				exprCtx.stack.push({ op: "*" });
				break;
			case TOKEN_TYPES.SLASH:
				exprCtx.lexer.next();
				parse_term(exprCtx);
				exprCtx.stack.push({ op: "/" });
				break;
			case TOKEN_TYPES.BAND:
				exprCtx.lexer.next();
				parse_term(exprCtx);
				exprCtx.stack.push({ op: "BAND" });
				break;
			case TOKEN_TYPES.BOR:
				exprCtx.lexer.next();
				parse_term(exprCtx);
				exprCtx.stack.push({ op: "BOR" });
				break;
			case TOKEN_TYPES.BXOR:
				exprCtx.lexer.next();
				parse_term(exprCtx);
				exprCtx.stack.push({ op: "BXOR" });
				break;
			default:
				return;
		}
	}
}

function parse_term(exprCtx) {
	const tok = exprCtx.lexer.token();

	// console.log("parse_term", tok);

	switch (tok.type) {
		// function call :  <id> "(" <parmList> ")"
		//           var :  <id>
		// case TOKEN_TYPES.IDENTIFIER:
		// 	return parse_fn_var(tok.value);

		// function call :  "." <id> "(" <parmList> ")"
		//           var :  "." <id>
		case TOKEN_TYPES.DOT:
			exprCtx.lexer.next();
			return parse_fn_var(exprCtx);

		case TOKEN_TYPES.LEFT_PARENT: {
			exprCtx.lexer.next();

			const ctx = { ...exprCtx, stack: [] };
			parseExpr(ctx);
			exprCtx.stack.push(ctx.stack);

			if (!exprCtx.lexer.isToken(TOKEN_TYPES.RIGHT_PARENT))
				throw new VAExprError('TERM: Syntax Error: Missing ")"');

			exprCtx.lexer.next();
			break;
		}

		case TOKEN_TYPES.MINUS:
			exprCtx.lexer.next();
			parse_term(exprCtx);
			exprCtx.stack.push({ op: "NEG" });
			break;

		case TOKEN_TYPES.BANG:
			if (parse_local_label(exprCtx)) break;

			exprCtx.lexer.next();
			parse_term(exprCtx);
			exprCtx.stack.push({ op: "!" });
			break;

		case TOKEN_TYPES.GREATER:
			exprCtx.lexer.next();
			parse_term(exprCtx);
			exprCtx.stack.push({ op: "MSB" });
			break;

		case TOKEN_TYPES.LOWER:
			exprCtx.lexer.next();
			parse_term(exprCtx);
			exprCtx.stack.push({ op: "LSB" });
			break;

		case TOKEN_TYPES.AT: {
			exprCtx.lexer.next();

			if (!exprCtx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
				throw new VAExprError("TERM: Syntax Error in Cheap Label Name");

			const name = exprCtx.lexer.token().value;
			const value = exprCtx.symbols.getCheap(exprCtx.lastLabel, name);
			if (!value) throw new VAExprError("TERM: Unknown Cheap Label");

			exprCtx.lexer.next();
			exprCtx.stack.push(value);
			break;
		}

		default:
			if (tok.type === TOKEN_TYPES.COLON) {
				if (parse_local_label(exprCtx)) return;
			}

			// .FN() or .VAR
			// if(tok.type == TOKEN_TYPES.DOT && exprCtx.lexer.isLookahead(TOKEN_TYPES.IDENTIFIER)) {
			// 	exprCtx.lexer.next();
			// 	return parse_fn_var(exprCtx.lexer.token().value);
			// }

			// to handle case like LDA (expr),Y and LDA (expr,X)
			if (exprCtx.endSet?.has(tok.type)) return;

			parse_number(exprCtx);
	}
}

function parse_local_label(exprCtx) {
	// console.log("parse_local_label", exprCtx.lexer.pos(), exprCtx.lexer.line());

	if (
		!exprCtx.lexer.lookahead() ||
		!LLCHARSET.has(exprCtx.lexer.lookahead().type)
	)
		return false;

	exprCtx.lexer.next();

	const tokType = exprCtx.lexer.token().type;
	let count = 0;
	while (exprCtx.lexer.isToken(tokType)) {
		count++;
		exprCtx.lexer.next();
	}

	if (tokType === TOKEN_TYPES.MINUS) count = -count;

	// console.log("EXPR", exprCtx.pass, exprCtx.code.pc.toString(16), count);

	const addr = exprCtx.symbols.findClosestMarker(exprCtx.code.pc, count);
	exprCtx.stack.push({ value: addr, type: TOKEN_TYPES.NUMBER });

	// console.log("EXPR", {addr});

	return true;
}

function parse_number(exprCtx) {
	const tok = exprCtx.lexer.token();
	exprCtx.lexer.next();

	// console.log("parse_number", tok);

	switch (tok.type) {
		case TOKEN_TYPES.NUMBER:
			exprCtx.stack.push(tok);
			break;

		case TOKEN_TYPES.STRING:
			exprCtx.stack.push(tok);
			break;

		case TOKEN_TYPES.IDENTIFIER: {
			// console.log("IDENTIFER", name);

			parse_var_label(exprCtx, tok);

			break;
		}

		case TOKEN_TYPES.STAR: {
			const value = exprCtx.code.pc;
			exprCtx.stack.push({ type: TOKEN_TYPES.NUMBER, value });
			break;
		}

		default:
			throw new VAExprError(`NUMBER : Syntax Error ${tok}`);
	}
}

// (ns.)? varname ( .fieldname | [expr] )*
function parse_var_label(exprCtx, tok) {
	let name = tok.value;
	let ns = null;
	const checkIfExists = exprCtx.pass > 1 && !exprCtx.flags?.allowUndef;
	const tokens = [TOKEN_TYPES.DOT, TOKEN_TYPES.LEFT_BRACKET];

	// exprCtx.lexer.next();

	if (exprCtx.lexer.isToken(TOKEN_TYPES.DOT)) {
		// console.log("parse_var_label", name, exprCtx.symbols.exists(name), exprCtx.symbols.nsExists(name));

		// namespace.labelname
		// not a label, being a namespace
		if (!exprCtx.symbols.exists(name) && exprCtx.symbols.nsExists(name)) {
			ns = name;
			exprCtx.lexer.next();
			name = exprCtx.lexer.token().value;
			exprCtx.lexer.next();
		}
	}

	if (checkIfExists && !exprCtx.symbols.exists(name, ns)) {
		// console.log("----- ", exprCtx.symbols.namespaces[NS_GLOBAL]);
		const namespaces = exprCtx.symbols.search(name);
		let msg = `IDENTIFIER : Unknown identifier "${name}" in ${
			ns ? ns : exprCtx.symbols.namespace
		}`;
		if (namespaces.length)
			msg += `\nBut "${name}" exists in ${namespaces.join(", ")}`;

		throw new VAExprError(msg);
	}

	let value = exprCtx.symbols.get(name, ns);

	while (exprCtx.lexer.match(tokens)) {
		switch (exprCtx.lexer.token().type) {
			case TOKEN_TYPES.DOT: {
				exprCtx.lexer.next();

				if (value && value.type !== TOKEN_TYPES.OBJECT)
					throw new VAExprError(`IDENTIFIER : Not an object: "${name}"`);

				if (!exprCtx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
					throw new VAExprError(
						`IDENTIFIER : Invalid field name: "${exprCtx.lexer.token().text}"`,
					);

				name = exprCtx.lexer.token().text;
				const fieldValue = value?.value[name];

				if (value && fieldValue === undefined)
					throw new VAExprError(`IDENTIFIER : Unknown Object field: "${name}"`);

				value = {
					type: value ? getValueType(fieldValue) : TOKEN_TYPES.NUMBER,
					value: fieldValue,
				};

				exprCtx.lexer.next();
				break;
			}

			case TOKEN_TYPES.LEFT_BRACKET: {
				if (value && value.type !== TOKEN_TYPES.ARRAY)
					throw new VAExprError(
						`IDENTIFIER : Not an array ${ns ? `${ns}.` : ""}${name}`,
					);

				exprCtx.lexer.next();
				const arrayIdx = parseExpression(
					exprCtx,
					new Set([TOKEN_TYPES.RIGHT_BRACKET]),
					TOKEN_TYPES.NUMBER,
				);

				if (!exprCtx.lexer.isToken(TOKEN_TYPES.RIGHT_BRACKET))
					throw new VAExprError(
						`IDENTIFIER : Missing close bracket ${ns ? `${ns}.` : ""}${name}`,
					);

				exprCtx.lexer.next();

				if (arrayIdx.value >= value?.value.length)
					throw new VAExprError(
						`IDENTIFIER : Array index ${arrayIdx.value} out of bounds LEN:${value.value.length}`,
					);

				const itemValue = value?.value[arrayIdx.value];
				value =
					itemValue instanceof Token
						? itemValue
						: { type: getValueType(itemValue), value: itemValue };
				break;
			}
		}
	}

	// exprCtx.stack.push(value ?? {type: TOKEN_TYPES.IDENTIFIER, value});
	exprCtx.stack.push(
		value
			? { type: value.type, value: value.value }
			: { type: TOKEN_TYPES.NUMBER, value: undefined },
	);
}

// functions
//	.name( [parms] )
// variables
//	.name

function parse_fn_var(exprCtx) {
	return exprCtx.lexer.isLookahead(TOKEN_TYPES.LEFT_PARENT)
		? parse_function(exprCtx)
		: parse_variable(exprCtx);
}

// functions
//	.name( [parms] )
function parse_function(exprCtx) {
	const fnName = exprCtx.lexer.token().value;

	if (!isFunctionExists(fnName))
		throw new VAExprError(`TERM: Unknown function "${fnName}"`);

	exprCtx.lexer.next();
	exprCtx.lexer.next();

	const desiredParmCount = fnParmCount(fnName);
	const flags = fnFlags(fnName);
	let parmCount = 0;
	do {
		const ctx = { ...exprCtx, stack: [], flags };
		parseExpr(ctx);
		exprCtx.stack.push(ctx.stack);
		parmCount++;
	} while (exprCtx.lexer.isToken(TOKEN_TYPES.COMMA) && exprCtx.lexer.next());

	if (!exprCtx.lexer.isToken(TOKEN_TYPES.RIGHT_PARENT))
		throw new VAExprError('TERM: Syntax Error: Missing ")"');

	if (parmCount !== desiredParmCount)
		throw new VAExprError(
			`TERM: Wrong number of parameters for function "${fnName}". Expected ${desiredParmCount} Got ${parmCount}`,
		);

	exprCtx.stack.push({ op: "FN", fn: fnName, parmCount });
	exprCtx.lexer.next();
}

// variables
//	.name
function parse_variable(exprCtx) {
	const varName = exprCtx.lexer.token().value;
	exprCtx.stack.push(getVarValue(exprCtx, varName));
	exprCtx.lexer.next();
}
