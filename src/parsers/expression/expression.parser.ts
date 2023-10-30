import { Context } from "../../context.class";
import { VAExprError } from "../../helpers/errors.class";
import { getValueType } from "../../helpers/utils";
import { TOKEN_TYPES, Token, getTypeName } from "../../lexer/token.class";
import { getSysVarValue } from "../../sysvariable";
import { fnFlags, fnParmCount, isFunctionExists } from "../function.parser";
import { TDictValue } from "../../dict.class";
import { TExprCtx, TExprStackItem, TExprStackItemValueType } from "./expression.type";
import { evalExpr } from "./expression.eval";

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
	let res;
	const exprCtx: TExprCtx = {
		ctx: ctx,
		stack: [],
		endSet,
	};

	// ctx.pass >1 && log("parseExpression LINE", ctx.lexer.line());

	parseExpr(exprCtx);

	// ctx.pass >1 && log("parseExpression parseExpr", exprCtx.stack);

	if (exprCtx.stack.length) res = evalExpr(exprCtx, exprCtx.stack);

	if (ctx.pass < 2) return res;

	// ctx.pass >1 && log("parseExpression RESULT", res, exprCtx.stack);

	if (expectedType && expectedType !== res?.type)
		throw new VAExprError(
			`EXPR: Invalid type - expected ${getTypeName(expectedType)} received ${getTypeName(res?.type ?? 0)} (${
				res?.value
			})`,
		);

	return res;
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
				exprCtx.stack.push({ op: "AND", type: 0, value: 0 });
				break;

			case TOKEN_TYPES.OR:
				exprCtx.ctx.lexer.next();
				parse_cmp(exprCtx);
				exprCtx.stack.push({ op: "OR", type: 0, value: 0 });
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

	switch (exprCtx.ctx.lexer.tokenType()) {
		case TOKEN_TYPES.LOWER: {
			let op = "<";
			exprCtx.ctx.lexer.next();
			if (exprCtx.ctx.lexer.isToken(TOKEN_TYPES.EQUAL)) {
				op = "<=";
				exprCtx.ctx.lexer.next();
			}
			parse_add(exprCtx);
			exprCtx.stack.push({ op, type: 0, value: 0 });
			break;
		}

		case TOKEN_TYPES.GREATER: {
			let op = ">";
			exprCtx.ctx.lexer.next();
			if (exprCtx.ctx.lexer.isToken(TOKEN_TYPES.EQUAL)) {
				op = ">=";
				exprCtx.ctx.lexer.next();
			}
			parse_add(exprCtx);
			exprCtx.stack.push({ op, type: 0, value: 0 });
			break;
		}

		case TOKEN_TYPES.EQUAL:
			exprCtx.ctx.lexer.next();
			parse_add(exprCtx);
			exprCtx.stack.push({ op: "=", type: 0, value: 0 });
			break;

		case TOKEN_TYPES.BANG:
			if (!exprCtx.ctx.lexer.isLookahead(TOKEN_TYPES.EQUAL)) return;

			exprCtx.ctx.lexer.next();
			exprCtx.ctx.lexer.next();
			parse_add(exprCtx);
			exprCtx.stack.push({ op: "!=", type: 0, value: 0 });
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
				exprCtx.stack.push({ op: "+", type: 0, value: 0 });
				break;
			case TOKEN_TYPES.MINUS:
				exprCtx.ctx.lexer.next();
				// parse_add(exprCtx);
				parse_product(exprCtx);
				exprCtx.stack.push({ op: "-", type: 0, value: 0 });
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
				exprCtx.stack.push({ op: "*", type: 0, value: 0 });
				break;
			case TOKEN_TYPES.SLASH:
				exprCtx.ctx.lexer.next();
				parse_term(exprCtx);
				exprCtx.stack.push({ op: "/", type: 0, value: 0 });
				break;
			case TOKEN_TYPES.BAND:
				exprCtx.ctx.lexer.next();
				parse_term(exprCtx);
				exprCtx.stack.push({ op: "BAND", type: 0, value: 0 });
				break;
			case TOKEN_TYPES.BOR:
				exprCtx.ctx.lexer.next();
				parse_term(exprCtx);
				exprCtx.stack.push({ op: "BOR", type: 0, value: 0 });
				break;
			case TOKEN_TYPES.BXOR:
				exprCtx.ctx.lexer.next();
				parse_term(exprCtx);
				exprCtx.stack.push({ op: "BXOR", type: 0, value: 0 });
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
			exprCtx.stack.push({ op: "NEG", type: 0, value: 0 });
			break;

		case TOKEN_TYPES.BANG:
		case TOKEN_TYPES.COLON:
			if (parse_local_label(exprCtx)) break;

			exprCtx.ctx.lexer.next();
			parse_term(exprCtx);
			exprCtx.stack.push({ op: "!", type: 0, value: 0 });
			break;

		case TOKEN_TYPES.GREATER:
			exprCtx.ctx.lexer.next();
			parse_term(exprCtx);
			exprCtx.stack.push({ op: "MSB", type: 0, value: 0 });
			break;

		case TOKEN_TYPES.LOWER:
			exprCtx.ctx.lexer.next();
			parse_term(exprCtx);
			exprCtx.stack.push({ op: "LSB", type: 0, value: 0 });
			break;

		case TOKEN_TYPES.AT: {
			exprCtx.ctx.lexer.next();

			if (!exprCtx.ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
				throw new VAExprError("TERM: Syntax Error in Local Label Name");

			if (!exprCtx.ctx.lastLabel) throw new VAExprError("TERM: Unknown Parent Label");

			const name = exprCtx.ctx.lexer.token2().asString;
			const value = exprCtx.ctx.symbols.getLocal(exprCtx.ctx.lastLabel.name, name);
			if (!value) throw new VAExprError("TERM: Unknown Local Label");

			exprCtx.ctx.lexer.next();
			exprCtx.stack.push(value);
			break;
		}

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

	const addr = exprCtx.ctx.symbols.findClosestMarker(exprCtx.ctx.code.pc, count);
	if (exprCtx.ctx.pass > 1 && !addr) throw new VAExprError("TERM: Cant find local label !?!");

	exprCtx.stack.push({ value: addr ?? 0, type: TOKEN_TYPES.NUMBER });

	// console.log("EXPR", {addr});

	return true;
}

function parse_scalar(exprCtx: TExprCtx) {
	const tok = exprCtx.ctx.lexer.token2();
	exprCtx.ctx.lexer.next();

	// console.log("parse_number", tok);

	switch (tok?.type) {
		case TOKEN_TYPES.NUMBER:
			exprCtx.stack.push(tok as TExprStackItem);
			break;

		case TOKEN_TYPES.STRING:
			exprCtx.stack.push(tok as TExprStackItem);
			break;

		case TOKEN_TYPES.IDENTIFIER: {
			parse_var_label(exprCtx, tok);
			break;
		}

		case TOKEN_TYPES.STAR: {
			const value = exprCtx.ctx.code.pc;
			exprCtx.stack.push({ type: TOKEN_TYPES.NUMBER, value });
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

		if (exprCtx.ctx.symbols.nsHasFunction(name))
			throw new VAExprError("IDENTIFIER : Labels inside a function can't be access");

		// namespace.labelname
		// not a label, being a namespace
		if (!exprCtx.ctx.symbols.exists(name) && exprCtx.ctx.symbols.nsExists(name)) {
			ns = name;
			exprCtx.ctx.lexer.next();
			name = exprCtx.ctx.lexer.token2().asString;
			exprCtx.ctx.lexer.next();
		}
	}

	// log("parse_var_label", ns, name, ns?exprCtx.ctx.symbols.exists(name, ns):"");

	if (checkIfExists && !exprCtx.ctx.symbols.exists(name, ns)) {
		// console.log("----- ", exprCtx.ctx.symbols.namespaces[NS_GLOBAL]);

		let msg = "";
		if (exprCtx.ctx.symbols.nsHasFunction(name)) {
			msg = `IDENTIFIER : labels in function ${name} cannot be access from outside the function`;
		} else {
			const namespaces = exprCtx.ctx.symbols.search(name);
			msg = `IDENTIFIER : Unknown identifier "${name}" in ${ns ? ns : exprCtx.ctx.symbols.namespace}`;
			if (namespaces.length) msg += `\nBut "${name}" exists in ${namespaces.join(", ")}`;
		}

		throw new VAExprError(msg);
	}

	let value = exprCtx.ctx.symbols.get(name, ns);

	// log("parseVarLabel", value);

	value = parse_object_and_array(exprCtx, ns, name, value);

	if (!value && exprCtx.ctx.pass > 1) {
		throw new VAExprError(`IDENTIFIER: Cant find label ${name}`);
	}

	// exprCtx.stack.push(
	// 	value
	// 		? { type: value.type, value: value.value }
	// 		: { type: TOKEN_TYPES.NUMBER, value: undefined },
	// );
	exprCtx.stack.push({ type: value?.type, value: value?.value });

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

	exprCtx.ctx.lexer.next();
	exprCtx.ctx.lexer.next();

	const desiredParmCount = fnParmCount(fnName);
	const flags = fnFlags(fnName);
	let parmCount = 0;
	do {
		const ctx = duplicateContext(exprCtx);
		ctx.stack = [];
		ctx.flags = flags;

		parseExpr(ctx);
		exprCtx.stack.push(ctx.stack as Array<TExprStackItem>);
		parmCount++;
	} while (exprCtx.ctx.lexer.isToken(TOKEN_TYPES.COMMA) && exprCtx.ctx.lexer.next());

	if (!exprCtx.ctx.lexer.isToken(TOKEN_TYPES.RIGHT_PARENT)) throw new VAExprError('TERM: Syntax Error: Missing ")"');

	if (parmCount !== desiredParmCount)
		throw new VAExprError(
			`TERM: Wrong number of parameters for function "${fnName}". Expected ${desiredParmCount} Got ${parmCount}`,
		);

	exprCtx.stack.push({ op: "FN", fn: fnName, parmCount, type: 0, value: 0 });
	exprCtx.ctx.lexer.next();
}

// variables
//	.name
function parse_variable(exprCtx: TExprCtx) {
	if (!exprCtx.ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER)) throw new VAExprError("TERM: expecting a variable name here");

	const varName = exprCtx.ctx.lexer.token2().asString;
	let value = getSysVarValue(exprCtx.ctx, varName);

	exprCtx.ctx.lexer.next();

	value = parse_object_and_array(exprCtx, undefined, varName, value);

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
	varValue: TDictValue,
) {
	const ns = varNamespace;
	let name = varName;
	let value = varValue;

	while (exprCtx.ctx.lexer.match(FIELD_TOKENS)) {
		switch (exprCtx.ctx.lexer.tokenType()) {
			case TOKEN_TYPES.DOT: {
				exprCtx.ctx.lexer.next();

				if (value && value.type !== TOKEN_TYPES.OBJECT) throw new VAExprError(`IDENTIFIER : Not an object: "${name}"`);

				if (!exprCtx.ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
					throw new VAExprError(`IDENTIFIER : Invalid field name: "${exprCtx.ctx.lexer.token2().text}"`);

				name = exprCtx.ctx.lexer.token2().text;
				const obj = value?.value as Record<string, TExprStackItemValueType>;
				const fieldValue = obj?.[name];

				if (value && fieldValue === undefined) throw new VAExprError(`IDENTIFIER : Unknown Object field: "${name}"`);

				value = {
					type: value ? getValueType(fieldValue) : TOKEN_TYPES.NUMBER,
					value: fieldValue,
				};

				exprCtx.ctx.lexer.next();
				break;
			}

			case TOKEN_TYPES.LEFT_BRACKET: {
				if (value && value.type !== TOKEN_TYPES.ARRAY)
					throw new VAExprError(`IDENTIFIER : Not an array ${ns ? `${ns}.` : ""}${name}`);

				exprCtx.ctx.lexer.next();
				const arrayIdx = parseExpression(exprCtx.ctx, new Set([TOKEN_TYPES.RIGHT_BRACKET]), TOKEN_TYPES.NUMBER);

				if (!arrayIdx) throw new VAExprError("IDENTIFIER: Missing array index !?!");

				if (!exprCtx.ctx.lexer.isToken(TOKEN_TYPES.RIGHT_BRACKET))
					throw new VAExprError(`IDENTIFIER : Missing close bracket ${ns ? `${ns}.` : ""}${name}`);

				exprCtx.ctx.lexer.next();

				const valueArray = value?.value as Array<TExprStackItemValueType | Token>;
				const idx = arrayIdx.value as number;

				if (idx >= valueArray.length)
					throw new VAExprError(`IDENTIFIER : Array index ${arrayIdx.value} out of bounds LEN:${valueArray.length}`);

				// exprCtx.ctx.pass > 1 && log("ARRAY", idx, valueArray[idx], valueArray);

				const itemValue = valueArray[idx];
				value =
					itemValue instanceof Token
						? { type: getValueType(itemValue.value), value: itemValue.value as TExprStackItemValueType }
						: { type: getValueType(itemValue), value: itemValue };
				break;
			}
		}
	}

	return value;
}
