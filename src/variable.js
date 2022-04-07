import { ET_C, ET_P } from "./log.js";
import { getNStempEntry } from "./namespace.js";

export function getVarValue(ctx, name) {

	switch(name) {
		case "CPU":
			return { v: ctx.cpu, error: false };

		case "SEGMENTSIZE": {
			if(!ctx.currentSegment)
				return { v: null, et: ET_C, error: "No segment defined" };

			const segment= ctx.segments[ctx.currentSegment];
			return { v: segment.end - segment.start + 1, error: false };
		}

		case "SEGMENTEND": {
			if(!ctx.currentSegment)
				return { v: null, et: ET_C, error: "No segment defined" };

			const segment= ctx.segments[ctx.currentSegment];
			return { v: segment.end, error: false };
		}

		case "SEGMENTSTART": {
			if(!ctx.currentSegment)
				return { v: null, et: ET_C, error: "No segment defined" };

			const segment= ctx.segments[ctx.currentSegment];
			return { v: segment.start, error: false };
		}

		// for macros
		case "PARAMCOUNT": {
			// const varDef= getNSentry(ctx, "%locals%")?.v?.find(def => def.name == ".PARAMCOUNT");
			const varDef= getNStempEntry(ctx, ".PARAMCOUNT");
			return { v: varDef?.value, et: "MACRO ERROR", error: !varDef ? "can be use only inside a macro" : false };
		}

		default:
			return { v: -1, et:ET_P, error: `unknown variable "${name}"` };
	}
}
