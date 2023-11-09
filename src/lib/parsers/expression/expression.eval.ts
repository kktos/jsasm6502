import { VAExprError } from "../../helpers/errors.class";
import { TOKEN_TYPES } from "../../lexer/token.class";
import { TValueType } from "../../types/Value.type";
import { execFunction } from "../function.parser";
import { TExprCtx, TExprStack } from "./expression.type";
import { TExprStackItem } from "./TExprStackItem.class";

const log = console.log;

export function evalExpr(exprCtx: TExprCtx, stack: TExprStack) {
	// exprCtx.ctx.pass >1 && log("evalExpr BEGIN", stack);

	const localStack = [];
	while (stack.length > 1) {
		let item;
		while (stack.length) {
			item = stack.shift() as TExprStackItem;
			if (Array.isArray(item)) item = evalExpr(exprCtx, item);
			if (item.op) break;
			localStack.push(item);
		}

		// log("op:", item, localStack);

		switch (item?.op) {
			//
			// arithmetics
			//
			case "NEG": {
				const op1 = localStack.pop();
				if (!op1 || op1.type !== TOKEN_TYPES.NUMBER) throw new VAExprError("NEG: Only Numbers are allowed here");
				stack.unshift(TExprStackItem.newNumber(-Number(op1.value))); // { type: TOKEN_TYPES.NUMBER, value: -op1.value }
				break;
			}
			case "*": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");

				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("MULT: Only Numbers are allowed here");

				const res = op1.number * op2.number;
				stack.unshift(TExprStackItem.newNumber(res)); // { type: TOKEN_TYPES.NUMBER, value: (op1.value as number) * (op2.value as number)}
				break;
			}
			case "+": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");

				const resType =
					op1.type === TOKEN_TYPES.NUMBER || op2.type === TOKEN_TYPES.NUMBER ? TOKEN_TYPES.NUMBER : TOKEN_TYPES.STRING;

				const res =
					op1.isDefined && op2.isDefined
						? new TExprStackItem(resType, op1.number + op2.number)
						: new TExprStackItem(0, null);

				// log("ADD", String(op2).trim(), String(op1).trim(), String(sum).trim());

				stack.unshift(res);
				break;
			}
			case "/": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");

				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");

				stack.unshift(TExprStackItem.newNumber(op1.number / op2.number));
				break;
			}
			case "-": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");

				if (exprCtx.ctx.pass > 1 && (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)) {
					throw new VAExprError("Only Numbers are allowed here");
				}
				const res = op1.number - op2.number;
				stack.unshift(TExprStackItem.newNumber(res)); // { type: TOKEN_TYPES.NUMBER, value: (op1.value as number) - (op2.value as number)}
				break;
			}

			//
			// comparaisons
			//
			case "<": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");

				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");

				const res = op1.number < op2.number ? 1 : 0;
				stack.unshift(TExprStackItem.newNumber(res)); // { type: TOKEN_TYPES.NUMBER, value: (op1.value as number) < (op2.value as number)}
				break;
			}
			case "<=": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");

				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");

				const res = op1.number <= op2.number ? 1 : 0;
				stack.unshift(TExprStackItem.newNumber(res));
				break;
			}
			case ">": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");

				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");

				const res = op1.number > op2.number ? 1 : 0;
				stack.unshift(TExprStackItem.newNumber(res));
				break;
			}
			case ">=": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");

				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");

				const res = op1.number >= op2.number ? 1 : 0;
				stack.unshift(TExprStackItem.newNumber(res));
				break;
			}
			case "=": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");

				if (op1.type !== op2.type) {
					const validators = [
						op1.type === TOKEN_TYPES.NUMBER && op2.type === TOKEN_TYPES.STRING,
						op1.type === TOKEN_TYPES.STRING && op2.type === TOKEN_TYPES.NUMBER,
					];
					if (!validators.some((test) => test === true)) throw new VAExprError("Incompatible types for equality");
				}

				const res = op1.number === op2.number ? 1 : 0;
				stack.unshift(TExprStackItem.newNumber(res));
				break;
			}
			case "!=": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");

				if (op1.type !== op2.type) {
					const validators = [
						op1.type === TOKEN_TYPES.NUMBER && op2.type === TOKEN_TYPES.STRING,
						op1.type === TOKEN_TYPES.STRING && op2.type === TOKEN_TYPES.NUMBER,
					];
					if (!validators.some((test) => test === true)) throw new VAExprError("Incompatible types for inequality");
				}
				const res = op1.number !== op2.number ? 1 : 0;
				stack.unshift(TExprStackItem.newNumber(res));
				break;
			}

			//
			// booleans
			//
			case "!": {
				const op1 = localStack.pop();
				if (!op1 || op1.type !== TOKEN_TYPES.NUMBER) throw new VAExprError("Only Numbers are allowed here");
				stack.unshift(TExprStackItem.newNumber(op1.number ? 0 : 1));
				break;
			}
			case "AND": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("AND: Only Numbers are allowed here");
				stack.unshift(TExprStackItem.newNumber(op1.number && op2.number));
				break;
			}
			case "OR": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("OR: Only Numbers are allowed here");
				stack.unshift(TExprStackItem.newNumber(op1.number || op2.number));
				break;
			}

			//
			// bitwise
			//
			case "BAND": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("BAND: Only Numbers are allowed here");
				stack.unshift(TExprStackItem.newNumber(op1.number & op2.number));
				break;
			}
			case "BOR": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();

				let value1 = 0;
				switch (op1?.type) {
					case TOKEN_TYPES.NUMBER:
						value1 = op1.number;
						break;
					case TOKEN_TYPES.STRING:
						if (op1.string.length === 1) {
							value1 = op1.string.charCodeAt(0);
							break;
						}
						throw new VAExprError("BOR: Only Numbers are allowed here");
					default:
						throw new VAExprError("BOR: Only Numbers are allowed here");
				}

				let value2 = 0;
				switch (op2?.type) {
					case TOKEN_TYPES.NUMBER:
						value2 = op2.number;
						break;
					case TOKEN_TYPES.STRING:
						if (op2.string.length === 1) {
							value2 = op2.string.charCodeAt(0);
							break;
						}
						throw new VAExprError("BOR: Only Numbers are allowed here");
					default:
						throw new VAExprError("BOR: Only Numbers are allowed here");
				}

				stack.unshift(TExprStackItem.newNumber(value1 | value2));
				break;
			}
			case "BXOR": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");
				if (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("BXOR: Only Numbers are allowed here");
				stack.unshift(TExprStackItem.newNumber(op1.number ^ op2.number));
				break;
			}

			//
			// functions
			//
			case "FN": {
				const parms: TValueType[] = [];
				let parmCount = item.paramCount ?? 0;
				while (parmCount-- && localStack.length) {
					parms.unshift(localStack.pop()?.value as TValueType);
				}
				const res = execFunction(exprCtx.ctx, item.fn as string, parms);
				stack.unshift(res);
				break;
			}
			case "MSB": {
				const op1 = localStack.pop();
				if (!op1) throw new VAExprError("MSB: Need a value");
				if (exprCtx.ctx.pass > 1 && op1.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("MSB: Only Numbers are allowed here");
				stack.unshift(TExprStackItem.newNumber((op1.number >> 8) & 0xff));
				break;
			}
			case "LSB": {
				const op1 = localStack.pop();
				if (!op1) throw new VAExprError("LSB: Need a value");
				if (exprCtx.ctx.pass > 1 && op1.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("LSB: Only Numbers are allowed here");
				stack.unshift(TExprStackItem.newNumber(op1.number & 0xff));
				break;
			}

			default:
				throw new VAExprError(`Unknown operation ${JSON.stringify(item)}`);
		}
	}

	// exprCtx.ctx.pass >1 && log("evalExpr END", stack[0]);

	return stack[0] as TExprStackItem;
}
