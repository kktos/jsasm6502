import { Context } from "./context.class";
import { VAExprError } from "./helpers/errors.class";
import { TOKEN_TYPES } from "./lexer/token.class";

export function getVarValue(ctx: Context, name: string) {
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

		case "NAMESPACE":
		case "NS": {
			return { type: TOKEN_TYPES.STRING, value: ctx.symbols.namespace };
		}

		// // for macros
		// case "PARAMCOUNT": {
		// 	const varDef= getNStempEntry(ctx, ".PARAMCOUNT");
		// 	return { v: varDef?.value, et: "MACRO ERROR", error: !varDef ? "can be use only inside a macro" : false };
		// }

		default:
			throw new VAExprError(`Unknown variable "${name}"`);
	}
}
