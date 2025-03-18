import type { TSegment } from "../compiler.class";
import type { Context } from "../context.class";
import { VAParseError } from "../helpers/errors.class";
import { validateSchema } from "../helpers/schema";
import { TOKEN_TYPES } from "../lexer/token.class";
import { readBlock } from "../parsers/block.parser";
import type { TValueType } from "../types/Value.type";

export function processSegment(ctx: Context) {
	const segmentName = ctx.lexer.identifier();
	if (!segmentName) throw new VAParseError("SEGMENT: Need a segment name");

	ctx.lexer.next();

	if (!ctx.lexer.isToken(TOKEN_TYPES.LEFT_CURLY_BRACE)) {
		ctx.code.select(segmentName);
		return true;
	}

	let block = null;

	// if all in one line like: .segment { start: $1000, end: $1100 }
	const unparsedLine = ctx.lexer.unparsedLine();
	if (unparsedLine?.match(/^\{/) && unparsedLine?.match(/\}$/)) {
		block = unparsedLine;
		while (ctx.lexer.next());
	}

	if (!block) {
		// TODO: readJSONBlock, as here we're dealing with JSON so no need to parse
		[block] = readBlock(ctx, { wantRaw: true });
		block = `{${block}}`;
	}

	if (ctx.pass > 1) return true;

	if (ctx.code.has(segmentName)) throw new VAParseError("SEGMENT: segment already defined");

	let value: TValueType;
	try {
		const json = block.replace(/\t/g, " ").trim();
		if (!json) throw new VAParseError("Empty block");
		value = ctx.YAMLparse(json);
	} catch (e) {
		throw new VAParseError(`Invalid JSON : ${(e as Error).message}`);
	}

	if (typeof value !== "object") throw new VAParseError("SEGMENT: Need an object");

	try {
		validateSchema(value, {
			start: { type: "number", isRequired: true },
			end: { type: "number", isRequired: true },
			pad: { type: "number" },
		});
	} catch (e) {
		throw new VAParseError(`SEGMENT: Invalid segment definition : ${(e as Error).message}`);
	}

	ctx.code.add(segmentName, value as unknown as TSegment);

	return true;
}
