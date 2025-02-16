import type { Context } from "../../context.class";
import { VAExprError } from "../../helpers/errors.class";
import { getValueType } from "../../helpers/utils";
import { TOKEN_TYPES, Token, getTypeName } from "../../lexer/token.class";
import { getSysVarValue } from "../../sysvariable";
import { fnFlags, fnParmCount, isFunctionExists } from "../function.parser";
import type { TExprCtx, TExprStackOperation } from "./expression.type";
import { TExprStackItem } from "./TExprStackItem.class";
import { evalExpr } from "./expression.eval";
import type { TValueType } from "../../types/Value.type";

const log = console.log;

const LLCHARSET = new Set([TOKEN_TYPES.MINUS, TOKEN_TYPES.PLUS]);
const FIELD_TOKENS = [TOKEN_TYPES.DOT, TOKEN_TYPES.LEFT_BRACKET];

function duplicateContext(exprCtx: TExprCtx): TExprCtx {
	return {
		ctx: exprCtx.ctx,
		stack: exprCtx.stack,
		endSet: exprCtx.endSet,
		flags: exprCtx.flags,
	};
}

/*
	returns integer expression result or SE

	expr -> expr '+' term | expr '-' term | term
	term -> term '*' factor | term '/' factor | factor
	factor -> '(' expr ')' | identifier | number | '-' factor
*/

//type ReadFileFunction= <T extends boolean>(filename: string, fromFile?: string, asBin?: T) => (T extends true ? ReadFileReturnBuffer : ReadFileReturnString);

export function parseExpression(ctx: Context, endSet?: Set<number>, expectedType?: number): TExprStackItem | undefined {
	let res: TExprStackItem | undefined;
	const exprCtx: TExprCtx = {
		ctx: ctx,
		stack: [],
		endSet,
	};

	// ctx.pass >1 && log("parseExpression LINE", ctx.lexer.line());

	while (true) {
		// ctx.pass >1 && log("parseExpression tokens", ctx.lexer.tokens);

		parseExpr(exprCtx);

		// log("parseExpression token", ctx.lexer.token());

		// ctx.pass >1 && log("parseExpression Stack", JSON.stringify(exprCtx.stack));
		// ctx.pass >1 && log("parseExpression Stack Len", exprCtx.stack.length);

		if (exprCtx.stack.length) res = evalExpr(exprCtx, exprCtx.stack);

		if (res?.type !== TOKEN_TYPES.EXPRESSION) break;

		exprCtx.stack.pop();

		// log("parseExpression stack", exprCtx.stack);
	}

	// if (ctx.pass < 2) return res;

	// ctx.pass >1 && log("parseExpression RESULT", res, exprCtx.stack);

	if (res?.type && expectedType && expectedType !== res?.type)
		throw new VAExprError(
			`EXPR: Invalid type - expected ${getTypeName(expectedType)} received ${getTypeName(
				res?.type ?? 0,
			)} (${JSON.stringify(res?.value)})`,
		);

	return res;
}

export function parseExpressionAsNumber(ctx: Context, endSet?: Set<number>): TExprStackItem {
	return parseExpression(ctx, endSet, TOKEN_TYPES.NUMBER) as TExprStackItem;
}

function parseExpr(exprCtx: TExprCtx) {
	let tok: Token | null;

	// console.log(`parseExpr()`);

	parse_cmp(exprCtx);

	while (true) {
		tok = exprCtx.ctx.lexer.token();
		switch (tok?.type) {
			case TOKEN_TYPES.AND:
				exprCtx.ctx.lexer.next();
				parse_cmp(exprCtx);
				exprCtx.stack.push(new TExprStackItem(0, 0, "AND")); // { op: "AND", type: 0, value: 0 }
				break;

			case TOKEN_TYPES.OR:
				exprCtx.ctx.lexer.next();
				parse_cmp(exprCtx);
				exprCtx.stack.push(new TExprStackItem(0, 0, "OR")); // { op: "OR", type: 0, value: 0 }
				break;

			default:
				// console.log("parseExpr", {stack: exprCtx.stack});
				return;
		}
	}
}

function parse_cmp(exprCtx: TExprCtx) {
	// console.log(`parse_cmp()`);

	parse_add(exprCtx);

	// console.log("parse_cmp", {stack: exprCtx.stack});

	if (exprCtx.endSet?.has(exprCtx.ctx.lexer.tokenType() ?? 0)) return;

	let op: TExprStackOperation;

	switch (exprCtx.ctx.lexer.tokenType()) {
		case TOKEN_TYPES.LOWER: {
			op = "<";
			exprCtx.ctx.lexer.next();
			if (exprCtx.ctx.lexer.isToken(TOKEN_TYPES.EQUAL)) {
				op = "<=";
				exprCtx.ctx.lexer.next();
			}
			parse_add(exprCtx);
			exprCtx.stack.push(new TExprStackItem(0, 0, op)); // { op, type: 0, value: 0 }
			break;
		}

		case TOKEN_TYPES.GREATER: {
			op = ">";
			exprCtx.ctx.lexer.next();
			if (exprCtx.ctx.lexer.isToken(TOKEN_TYPES.EQUAL)) {
				op = ">=";
				exprCtx.ctx.lexer.next();
			}
			parse_add(exprCtx);
			exprCtx.stack.push(new TExprStackItem(0, 0, op)); // { op, type: 0, value: 0 }
			break;
		}

		case TOKEN_TYPES.EQUAL:
			exprCtx.ctx.lexer.next();
			parse_add(exprCtx);
			exprCtx.stack.push(new TExprStackItem(0, 0, "=")); // { op: "=", type: 0, value: 0 }
			break;

		case TOKEN_TYPES.BANG:
			if (!exprCtx.ctx.lexer.isLookahead(TOKEN_TYPES.EQUAL)) return;

			exprCtx.ctx.lexer.next();
			exprCtx.ctx.lexer.next();
			parse_add(exprCtx);
			exprCtx.stack.push(new TExprStackItem(0, 0, "!=")); // { op: "!=", type: 0, value: 0 }
			break;

		default:
			return;
	}
}

function parse_add(exprCtx: TExprCtx) {
	parse_product(exprCtx);

	while (true) {
		switch (exprCtx.ctx.lexer.tokenType()) {
			case TOKEN_TYPES.PLUS:
				exprCtx.ctx.lexer.next();
				// parse_add(exprCtx);
				parse_product(exprCtx);
				exprCtx.stack.push(new TExprStackItem(0, 0, "+")); // { op: "+", type: 0, value: 0 }
				break;
			case TOKEN_TYPES.MINUS:
				exprCtx.ctx.lexer.next();
				// parse_add(exprCtx);
				parse_product(exprCtx);
				exprCtx.stack.push(new TExprStackItem(0, 0, "-")); // { op: "-", type: 0, value: 0 }
				break;
			default:
				return;
		}
	}
}

function parse_product(exprCtx: TExprCtx) {
	parse_term(exprCtx);

	while (true) {
		switch (exprCtx.ctx.lexer.tokenType()) {
			case TOKEN_TYPES.STAR:
				exprCtx.ctx.lexer.next();
				parse_term(exprCtx);
				exprCtx.stack.push(new TExprStackItem(0, 0, "*")); // { op: "*", type: 0, value: 0 }
				break;
			case TOKEN_TYPES.SLASH:
				exprCtx.ctx.lexer.next();
				parse_term(exprCtx);
				exprCtx.stack.push(new TExprStackItem(0, 0, "/")); // { op: "/", type: 0, value: 0 }
				break;
			case TOKEN_TYPES.BAND:
				exprCtx.ctx.lexer.next();
				parse_term(exprCtx);
				exprCtx.stack.push(new TExprStackItem(0, 0, "BAND")); // { op: "BAND", type: 0, value: 0 }
				break;
			case TOKEN_TYPES.BOR:
				exprCtx.ctx.lexer.next();
				parse_term(exprCtx);
				exprCtx.stack.push(new TExprStackItem(0, 0, "BOR")); // { op: "BOR", type: 0, value: 0 }
				break;
			case TOKEN_TYPES.BXOR:
				exprCtx.ctx.lexer.next();
				parse_term(exprCtx);
				exprCtx.stack.push(new TExprStackItem(0, 0, "BXOR")); // { op: "BXOR", type: 0, value: 0 }
				break;
			default:
				return;
		}
	}
}

function parse_term(exprCtx: TExprCtx) {
	const tok = exprCtx.ctx.lexer.token();

	// log("parse_term", tok);

	switch (tok?.type) {
		// function call :  <id> "(" <parmList> ")"
		//           var :  <id>
		// case TOKEN_TYPES.IDENTIFIER:
		// 	return parse_fn_var(tok.value);

		// function call :  "." <id> "(" <parmList> ")"
		//           var :  "." <id>
		case TOKEN_TYPES.DOT:
			exprCtx.ctx.lexer.next();
			return parse_fn_var(exprCtx);

		case TOKEN_TYPES.LEFT_PARENT: {
			exprCtx.ctx.lexer.next();

			const ctx = duplicateContext(exprCtx);
			ctx.stack = [];

			parseExpr(ctx);
			exprCtx.stack.push(ctx.stack as Array<TExprStackItem>);

			if (!exprCtx.ctx.lexer.isToken(TOKEN_TYPES.RIGHT_PARENT))
				throw new VAExprError('TERM: Syntax Error: Missing ")"');

			exprCtx.ctx.lexer.next();
			break;
		}

		case TOKEN_TYPES.MINUS:
			exprCtx.ctx.lexer.next();
			parse_term(exprCtx);
			exprCtx.stack.push(new TExprStackItem(0, 0, "NEG")); // { op: "NEG", type: 0, value: 0 }
			break;

		case TOKEN_TYPES.BANG:
		case TOKEN_TYPES.COLON:
			if (parse_local_label(exprCtx)) break;

			exprCtx.ctx.lexer.next();
			parse_term(exprCtx);
			exprCtx.stack.push(new TExprStackItem(0, 0, "!")); // { op: "!", type: 0, value: 0 }
			break;

		case TOKEN_TYPES.GREATER:
			exprCtx.ctx.lexer.next();
			parse_term(exprCtx);
			exprCtx.stack.push(new TExprStackItem(0, 0, "MSB")); // { op: "MSB", type: 0, value: 0 }
			break;

		case TOKEN_TYPES.LOWER:
			exprCtx.ctx.lexer.next();
			parse_term(exprCtx);
			exprCtx.stack.push(new TExprStackItem(0, 0, "LSB")); // { op: "LSB", type: 0, value: 0 }
			break;

		// case TOKEN_TYPES.AT: {
		// 	exprCtx.ctx.lexer.next();

		// 	if (!exprCtx.ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
		// 		throw new VAExprError("TERM: Syntax Error in Local Label Name");

		// 	if (!exprCtx.ctx.lastLabel) throw new VAExprError("TERM: Unknown Parent Label");

		// 	const name = exprCtx.ctx.lexer.token2().asString;
		// 	const value = exprCtx.ctx.symbols.local.get(exprCtx.ctx.lastLabel.name, name);
		// 	if (!value) throw new VAExprError("TERM: Unknown Local Label");

		// 	exprCtx.ctx.lexer.next();
		// 	exprCtx.stack.push(value);
		// 	break;
		// }

		default:
			if (tok?.type === TOKEN_TYPES.COLON) {
				if (parse_local_label(exprCtx)) return;
			}

			// .FN() or .VAR
			// if(tok.type == TOKEN_TYPES.DOT && exprCtx.ctx.lexer.isLookahead(TOKEN_TYPES.IDENTIFIER)) {
			// 	exprCtx.ctx.lexer.next();
			// 	return parse_fn_var(exprCtx.ctx.lexer.token().value);
			// }

			// to handle case like LDA (expr),Y and LDA (expr,X)
			if (tok?.type && exprCtx.endSet?.has(tok.type)) return;

			parse_scalar(exprCtx);
	}
}

function parse_local_label(exprCtx: TExprCtx) {
	// log("parse_local_label", exprCtx.ctx.lexer.pos(), exprCtx.ctx.lexer.line());

	if (!exprCtx.ctx.lexer.lookahead() || !LLCHARSET.has(exprCtx.ctx.lexer.lookaheadType() as number)) return false;

	exprCtx.ctx.lexer.next();

	const tokType = exprCtx.ctx.lexer.tokenType();
	let count = 0;
	while (tokType && exprCtx.ctx.lexer.isToken(tokType)) {
		count++;
		exprCtx.ctx.lexer.next();
	}

	if (tokType === TOKEN_TYPES.MINUS) count = -count;

	// console.log("EXPR", exprCtx.pass, exprCtx.code.pc.toString(16), count);

	const addr = exprCtx.ctx.symbols.marker.findClosest(exprCtx.ctx.code.pc, count);
	if (exprCtx.ctx.pass > 1 && !addr) throw new VAExprError("TERM: Cant find local label !?!");

	exprCtx.stack.push(new TExprStackItem(TOKEN_TYPES.NUMBER, addr ?? 0));
	// exprCtx.stack.push({ value: addr ?? 0, type: TOKEN_TYPES.NUMBER });

	// console.log("EXPR", {addr});

	return true;
}

function parse_scalar(exprCtx: TExprCtx) {
	const tok = exprCtx.ctx.lexer.token2();
	// log("parse_scalar 1", tok);

	exprCtx.ctx.lexer.next();

	// log("parse_scalar 2", exprCtx.ctx.lexer.token());

	switch (tok?.type) {
		case TOKEN_TYPES.NUMBER:
			exprCtx.stack.push(TExprStackItem.fromToken(tok));
			// exprCtx.stack.push(tok as TExprStackItem);
			break;

		case TOKEN_TYPES.STRING:
			exprCtx.stack.push(TExprStackItem.fromToken(tok));
			// exprCtx.stack.push(tok as TExprStackItem);
			break;

		case TOKEN_TYPES.IDENTIFIER: {
			parse_var_label(exprCtx, tok);
			break;
		}

		case TOKEN_TYPES.STAR: {
			const value = exprCtx.ctx.code.pc;
			exprCtx.stack.push(new TExprStackItem(TOKEN_TYPES.NUMBER, value)); // { type: TOKEN_TYPES.NUMBER, value }
			break;
		}

		default:
			throw new VAExprError(`NUMBER : Syntax Error ${tok}`);
	}
}

// (ns.)? varname ( .fieldname | [expr] )*
function parse_var_label(exprCtx: TExprCtx, tok: Token) {
	let name = tok.asString;
	let ns = undefined;
	const checkIfExists = exprCtx.ctx.pass > 1 && !exprCtx.flags?.allowUndef;

	// exprCtx.ctx.lexer.next();

	// log("parseVarLabel", exprCtx.ctx.pass, tok);

	if (exprCtx.ctx.lexer.isToken(TOKEN_TYPES.DOT)) {
		// log("parse_var_label", name, exprCtx.ctx.symbols.exists(name), exprCtx.ctx.symbols.nsExists(name));

		if (exprCtx.ctx.symbols.fn.has(name))
			throw new VAExprError("IDENTIFIER : Labels inside a function can't be access");

		// namespace.labelname
		// not a label, being a namespace
		if (!exprCtx.ctx.symbols.exists(name) && exprCtx.ctx.symbols.ns.has(name)) {
			ns = name;
			exprCtx.ctx.lexer.next();
			name = exprCtx.ctx.lexer.token2().asString;
			exprCtx.ctx.lexer.next();
		}
	}

	// log("parse_var_label", exprCtx.ctx.pass, name, ns, exprCtx.ctx.symbols.exists(name, ns));

	if (checkIfExists && !exprCtx.ctx.symbols.exists(name, ns)) {
		// console.log("----- ", exprCtx.ctx.symbols.namespaces[NS_GLOBAL]);

		let msg = "";
		if (exprCtx.ctx.symbols.fn.has(name)) {
			msg = `IDENTIFIER : labels in function ${name} cannot be access from outside the function`;
		} else {
			const namespaces = exprCtx.ctx.symbols.search(name);
			msg = `IDENTIFIER : Unknown identifier "${name}" in ${ns ? ns : exprCtx.ctx.symbols.namespace}`;
			if (namespaces.length) msg += `\nBut "${name}" exists in ${namespaces.join(", ")}`;
		}

		throw new VAExprError(msg);
	}

	let value = exprCtx.ctx.symbols.get(name, ns);

	const isDefined = value?.isDefined ?? false;

	// log("parseVarLabel VALUE-1", exprCtx.ctx.pass, ns, name, JSON.stringify(value), !isDefined ?"UNDEFINED":"");

	value = parse_object_and_array(exprCtx, ns, name, value);

	// log("parseVarLabel VALUE-2", exprCtx.ctx.pass, ns, name, JSON.stringify(value));

	if (!value && checkIfExists) {
		throw new VAExprError(`IDENTIFIER: Cant find label ${name}`);
	}

	// log("parseVarLabel VALUE", exprCtx.ctx.pass, String(value).trim());

	exprCtx.stack.push(new TExprStackItem(isDefined ? (value?.type ?? 0) : 0, value?.value ?? null));

	// log("parseVarLabel END", { type: value?.type, value: value?.value });
}

// functions
//	.name( [parms] )
// variables
//	.name

function parse_fn_var(exprCtx: TExprCtx) {
	return exprCtx.ctx.lexer.isLookahead(TOKEN_TYPES.LEFT_PARENT) ? parse_function(exprCtx) : parse_variable(exprCtx);
}

// functions
//	.name( [parms] )
function parse_function(exprCtx: TExprCtx) {
	if (!exprCtx.ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER)) throw new VAExprError("TERM: expecting a function name here");

	const fnName = exprCtx.ctx.lexer.token2().asString;

	if (!isFunctionExists(fnName)) throw new VAExprError(`TERM: Unknown function "${fnName}"`);

	// log("ExprParser FN", fnName);

	exprCtx.ctx.lexer.next();
	exprCtx.ctx.lexer.next();

	const { minParmCount, maxParmCount } = fnParmCount(fnName);
	let parmCount = 0;

	if (exprCtx.ctx.lexer.isToken(TOKEN_TYPES.RIGHT_PARENT)) {
		if (minParmCount !== 0)
			throw new VAExprError(
				`TERM: Wrong number of parameters for function "${fnName}". Expected ${
					maxParmCount ?? minParmCount
				} Got ${parmCount}`,
			);
	} else {
		if (maxParmCount === 0) throw new VAExprError(`TERM: function "${fnName}" admits no parameter.`);

		const flags = fnFlags(fnName);
		do {
			const ctx = duplicateContext(exprCtx);
			ctx.stack = [];
			ctx.flags = flags;

			parseExpr(ctx);

			// log("ExprParser FN stack", JSON.stringify(ctx.stack));

			exprCtx.stack.push(ctx.stack as Array<TExprStackItem>);
			parmCount++;
		} while (exprCtx.ctx.lexer.isToken(TOKEN_TYPES.COMMA) && exprCtx.ctx.lexer.next());

		if (!exprCtx.ctx.lexer.isToken(TOKEN_TYPES.RIGHT_PARENT)) throw new VAExprError('TERM: Syntax Error: Missing ")"');

		if ((minParmCount && parmCount < minParmCount) || (maxParmCount && parmCount > maxParmCount))
			throw new VAExprError(
				`TERM: Wrong number of parameters for function "${fnName}". Expected ${
					maxParmCount ?? minParmCount
				} Got ${parmCount}`,
			);
	}

	// log("ExprParser FN", fnName, parmCount);

	exprCtx.stack.push(TExprStackItem.newFunction(fnName, parmCount)); // { op: "FN", fn: fnName, parmCount, type: 0, value: 0 }
	exprCtx.ctx.lexer.next();
}

// variables
//	.name
function parse_variable(exprCtx: TExprCtx) {
	if (!exprCtx.ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER)) throw new VAExprError("TERM: expecting a variable name here");

	const varName = exprCtx.ctx.lexer.token2().asString;
	let value: TExprStackItem = getSysVarValue(exprCtx.ctx, varName);

	exprCtx.ctx.lexer.next();

	value = parse_object_and_array(exprCtx, undefined, varName, value) as TExprStackItem;

	exprCtx.stack.push(value);
	// exprCtx.ctx.lexer.next();
}

// parse object fields and array indices
//  field : "." <identifier>
//  array : "[" <expr> "]"
function parse_object_and_array(
	exprCtx: TExprCtx,
	varNamespace: string | undefined,
	varName: string,
	varValue: TExprStackItem | undefined,
) {
	const ns = varNamespace;
	let name = varName;
	let value = varValue;

	while (exprCtx.ctx.lexer.match(FIELD_TOKENS)) {
		switch (exprCtx.ctx.lexer.tokenType()) {
			case TOKEN_TYPES.DOT: {
				exprCtx.ctx.lexer.next();

				if (value && value.type !== TOKEN_TYPES.OBJECT)
					throw new VAExprError(`IDENTIFIER : Not an object: "${name}" ${JSON.stringify(value)}`);

				if (!exprCtx.ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
					throw new VAExprError(`IDENTIFIER : Invalid field name: "${exprCtx.ctx.lexer.token2().text}"`);

				name = exprCtx.ctx.lexer.token2().text;
				const obj = value?.value as Record<string, TValueType>;
				const fieldValue = obj?.[name];

				if (value && fieldValue === undefined) throw new VAExprError(`IDENTIFIER : Unknown Object field: "${name}"`);

				const type = value ? getValueType(fieldValue) : TOKEN_TYPES.NUMBER;
				if (!type) throw new VAExprError(`IDENTIFIER : Unknown Object field type: "${name}"`);

				value = new TExprStackItem(type, fieldValue);
				// value = {
				// 	type: value ? getValueType(fieldValue) : TOKEN_TYPES.NUMBER,
				// 	value: fieldValue,
				// };

				exprCtx.ctx.lexer.next();
				break;
			}

			case TOKEN_TYPES.LEFT_BRACKET: {
				if (value && value.type !== TOKEN_TYPES.ARRAY)
					throw new VAExprError(`IDENTIFIER : Not an array ${ns ? `${ns}.` : ""}${name}`);

				// log(exprCtx.ctx.pass, "ARRAY");

				exprCtx.ctx.lexer.next();
				const arrayIdx = parseExpression(exprCtx.ctx, new Set([TOKEN_TYPES.RIGHT_BRACKET]), TOKEN_TYPES.NUMBER);

				if (!arrayIdx) throw new VAExprError("IDENTIFIER: Missing array index !?!");

				if (!exprCtx.ctx.lexer.isToken(TOKEN_TYPES.RIGHT_BRACKET))
					throw new VAExprError(`IDENTIFIER : Missing close bracket ${ns ? `${ns}.` : ""}${name}`);

				exprCtx.ctx.lexer.next();

				// log(exprCtx.ctx.pass, "ARRAY", arrayIdx);

				const valueArray = value?.value as Array<TExprStackItem | Token>;
				const idx = arrayIdx.value as number;

				if (idx >= valueArray.length)
					throw new VAExprError(`IDENTIFIER : Array index ${arrayIdx.value} out of bounds LEN:${valueArray.length}`);

				// exprCtx.ctx.pass > 1 && log("ARRAY", idx, valueArray[idx], valueArray);

				const itemValue = valueArray[idx];

				// log(exprCtx.ctx.pass, "VALUE", String(value).trim(), "VALUE[idx]", itemValue);

				if (itemValue instanceof Token || itemValue instanceof TExprStackItem) {
					value = new TExprStackItem(itemValue.type ?? -1, itemValue.value);
				} else {
					value = new TExprStackItem(getValueType(itemValue) ?? -1, itemValue);
				}

				// value = { type: getValueType(itemValue.value), value: itemValue.value };

				// value =
				// 	itemValue instanceof Token
				// 		? { type: getValueType(itemValue.value), value: itemValue.value }
				// 		: { type: getValueType(itemValue.value), value: itemValue.value };
				break;
			}
		}
	}

	return value;
}
