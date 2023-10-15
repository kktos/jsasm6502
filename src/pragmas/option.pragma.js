import { NS_GLOBAL } from "../dict.class.js";
import { VAParseError } from "../helpers/errors.class.js";
import { getHexWord } from "../helpers/utils.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";


export function processOption(ctx, pragma) {
	const option = ctx.lexer.token().value;

	ctx.lexer.next();

	switch (option) {
		case "CHARMAP": {
			if (!ctx.lexer.isToken(TOKEN_TYPES.IDENTIFIER))
				throw new VAParseError("OPTION: need a defined charmap name");

			const parm = ctx.lexer.token().value;
			ctx.lexer.next();

			ctx.charMapManager.map= parm !== "NONE" ? parm : null;

			// if (parm === "NONE") {
			// 	ctx.charMap = null;
			// 	break;
			// }

			// const name = `CHARMAP_${parm}`;
			// let value = ctx.symbols.get(name);
			// if (!value) value = ctx.symbols.get(name, NS_GLOBAL);
			// if (!value) throw new VAParseError(`OPTION: unknown charmap ${parm}`);
			// if (value.type !== TOKEN_TYPES.ARRAY) {
			// 	throw new VAParseError(`OPTION: invalid charmap ${getHexWord(value.type)}, need an array`);
			// }
			// if (value.value.length !== 256)
			// 	throw new VAParseError("OPTION: invalid charmap, need 256 values");

			// ctx.charMap = value.value;
			break;
		}

		default:
			throw new VAParseError(`OPTION: unknown option ${option}`);
	}

	return true;
}
