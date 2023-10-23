import { Context } from "./context.class";
import { TDictValue } from "./dict.class";
import { VAExprError } from "./helpers/errors.class";
import { TOKEN_TYPES } from "./lexer/token.class";

const log= console.log;

export function getVarValue(ctx: Context, name: string): TDictValue {

	// log("getVarValue", ctx.pass, name);

	switch (name) {
		case "CPU":
			return { type: TOKEN_TYPES.STRING, value: ctx.cpu };

		case "SEGMENTSIZE": {
			const segment = ctx.code.segment();
			return {
				type: TOKEN_TYPES.NUMBER,
				value: segment.end - segment.start + 1,
			};
		}

		case "SEGMENTEND": {
			return { type: TOKEN_TYPES.NUMBER, value: ctx.code.segment().end };
		}

		case "SEGMENTSTART": {
			return { type: TOKEN_TYPES.NUMBER, value: ctx.code.segment().start };
		}

		case "SEGMENTNAME": {
			return { type: TOKEN_TYPES.STRING, value: ctx.code.segment().name };
		}

		case "SEGMENT": {
			return { type: TOKEN_TYPES.OBJECT, value: ctx.code.segment() };
		}

		case "NAMESPACE":
		case "NS": {
			return { type: TOKEN_TYPES.STRING, value: ctx.symbols.namespace };
		}

		case "PC": {
			return { type: TOKEN_TYPES.STRING, value: ctx.code.pc };
		}

		// // for macros
		// case "PARAMCOUNT": {
		// 	const varDef= getNStempEntry(ctx, ".PARAMCOUNT");
		// 	return { v: varDef?.value, et: "MACRO ERROR", error: !varDef ? "can be use only inside a macro" : false };
		// }

		default:
			throw new VAExprError(`SYS: Unknown variable "${name}"`);
	}
}
