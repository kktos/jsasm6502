import { VAExprError } from "../../helpers/errors.class";
import { TOKEN_TYPES } from "../../lexer/token.class";
import { execFunction } from "../function.parser";
import { TExprCtx, TExprStack, TExprStackItem, TExprStackItemValueType } from "./expression.type";

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

				if (op1?.type !== TOKEN_TYPES.NUMBER) throw new VAExprError("NEG: Only Numbers are allowed here");
				stack.unshift({ type: TOKEN_TYPES.NUMBER, value: -op1.value });
				break;
			}
			case "*": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();

				if (op1?.type !== TOKEN_TYPES.NUMBER || op2?.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("MULT: Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: (op1.value as number) * (op2.value as number),
				});
				break;
			}
			case "+": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");

				const resType =
					op1?.type === TOKEN_TYPES.NUMBER || op2?.type === TOKEN_TYPES.NUMBER
						? TOKEN_TYPES.NUMBER
						: TOKEN_TYPES.STRING;
				stack.unshift({
					type: resType,
					value: (op1.value as number) + (op2.value as number),
				});
				break;
			}
			case "/": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1?.type !== TOKEN_TYPES.NUMBER || op2?.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: (op1.value as number) / (op2.value as number),
				});
				break;
			}
			case "-": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (!op1 || !op2) throw new VAExprError("Need two operands here");

				if (exprCtx.ctx.pass > 1 && (op1.type !== TOKEN_TYPES.NUMBER || op2.type !== TOKEN_TYPES.NUMBER)) {
					throw new VAExprError("Only Numbers are allowed here");
				}
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: (op1.value as number) - (op2.value as number),
				});
				break;
			}

			//
			// comparaisons
			//
			case "<": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1?.type !== TOKEN_TYPES.NUMBER || op2?.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: Number(op1.value < op2.value),
				});
				break;
			}
			case "<=": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1?.type !== TOKEN_TYPES.NUMBER || op2?.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: Number(op1.value <= op2.value),
				});
				break;
			}
			case ">": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1?.type !== TOKEN_TYPES.NUMBER || op2?.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: Number(op1.value > op2.value),
				});
				break;
			}
			case ">=": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1?.type !== TOKEN_TYPES.NUMBER || op2?.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: Number(op1.value >= op2.value),
				});
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
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: Number(op1.value === op2.value),
				});
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
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: Number(op1.value !== op2.value),
				});
				break;
			}

			//
			// booleans
			//
			case "!": {
				const op1 = localStack.pop();
				if (op1?.type !== TOKEN_TYPES.NUMBER) throw new VAExprError("Only Numbers are allowed here");
				stack.unshift({ type: TOKEN_TYPES.NUMBER, value: Number(!op1.value) });
				break;
			}
			case "AND": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1?.type !== TOKEN_TYPES.NUMBER || op2?.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("AND: Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: op1.value && op2.value,
				});
				break;
			}
			case "OR": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1?.type !== TOKEN_TYPES.NUMBER || op2?.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("OR: Only Numbers are allowed here");
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
				if (op1?.type !== TOKEN_TYPES.NUMBER || op2?.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("BAND: Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: (op1.value as number) & (op2.value as number),
				});
				break;
			}
			case "BOR": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();

				let value1 = 0;
				switch (op1?.type) {
					case TOKEN_TYPES.NUMBER:
						value1 = op1.value as number;
						break;
					case TOKEN_TYPES.STRING:
						if ((op1.value as string).length === 1) {
							value1 = (op1.value as string).charCodeAt(0);
							break;
						}
						throw new VAExprError("BOR: Only Numbers are allowed here");
					default:
						throw new VAExprError("BOR: Only Numbers are allowed here");
				}

				let value2 = 0;
				switch (op2?.type) {
					case TOKEN_TYPES.NUMBER:
						value2 = op2.value as number;
						break;
					case TOKEN_TYPES.STRING:
						if ((op2.value as string).length === 1) {
							value2 = (op2.value as string).charCodeAt(0);
							break;
						}
						throw new VAExprError("BOR: Only Numbers are allowed here");
					default:
						throw new VAExprError("BOR: Only Numbers are allowed here");
				}

				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: value1 | value2,
				});
				break;
			}
			case "BXOR": {
				const op2 = localStack.pop();
				const op1 = localStack.pop();
				if (op1?.type !== TOKEN_TYPES.NUMBER || op2?.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("BXOR: Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: (op1.value as number) ^ (op2.value as number),
				});
				break;
			}

			//
			// functions
			//
			case "FN": {
				const parms: TExprStackItemValueType[] = [];
				let parmCount = item.parmCount ?? 0;
				while (parmCount-- && localStack.length) {
					parms.unshift(localStack.pop()?.value as TExprStackItemValueType);
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
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: ((op1.value as number) >> 8) & 0xff,
				});
				break;
			}
			case "LSB": {
				const op1 = localStack.pop();
				if (!op1) throw new VAExprError("LSB: Need a value");

				if (exprCtx.ctx.pass > 1 && op1.type !== TOKEN_TYPES.NUMBER)
					throw new VAExprError("LSB: Only Numbers are allowed here");
				stack.unshift({
					type: TOKEN_TYPES.NUMBER,
					value: (op1.value as number) & 0xff,
				});
				break;
			}

			default:
				throw new VAExprError(`Unknown operation ${item?.op}`);
		}
	}

	// exprCtx.ctx.pass >1 && log("evalExpr END", stack[0]);

	return stack[0] as TExprStackItem;
}
