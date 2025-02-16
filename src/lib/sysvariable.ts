import type { Context } from "./context.class";
import { VAExprError } from "./helpers/errors.class";
import { TExprStackItem } from "./parsers/expression/TExprStackItem.class";

const log = console.log;

export function getSysVarValue(ctx: Context, name: string) {
	// log("getVarValue", ctx.pass, name);

	switch (name) {
		case "CPU":
			return TExprStackItem.newString(ctx.cpu);

		case "SEGMENTSIZE": {
			const segment = ctx.code.segment();
			return TExprStackItem.newNumber(segment.end - segment.start + 1);
		}

		case "SEGMENTEND": {
			return TExprStackItem.newNumber(ctx.code.segment().end);
		}

		case "SEGMENTSTART": {
			return TExprStackItem.newNumber(ctx.code.segment().start);
		}

		case "SEGMENTNAME": {
			return TExprStackItem.newString(ctx.code.segment().name);
		}

		case "SEGMENT": {
			return TExprStackItem.newObject(ctx.code.segment());
		}

		case "NAMESPACE":
		case "NS": {
			return TExprStackItem.newString(ctx.symbols.namespace);
		}

		case "PC": {
			return TExprStackItem.newNumber(ctx.code.pc);
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
