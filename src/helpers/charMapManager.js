import { NS_GLOBAL } from "../dict.class.js";
import { VAParseError } from "../helpers/errors.class.js";
import { getHexWord } from "../helpers/utils.js";
import { TOKEN_TYPES } from "../lexer/lexer.class.js";

export class CharMapManager {

	constructor(symbols) {
		this.symbols= symbols;
		this.currentMap= null;
	}

	set map(mapName) {
		if(mapName===null) {
			this.currentMap = null;
			return;
		}

		const name = `CHARMAP_${mapName}`;
		let value = this.symbols.get(name);
		if (!value) value = this.symbols.get(name, NS_GLOBAL);
		if (!value) throw new VAParseError(`OPTION: unknown charmap ${mapName}`);
		if (value.type !== TOKEN_TYPES.ARRAY) {
			throw new VAParseError(`OPTION: invalid charmap ${getHexWord(value.type)}, need an array`);
		}
		if (value.value.length !== 256)
			throw new VAParseError("OPTION: invalid charmap, need 256 values");

		this.currentMap = value.value;
	}

	get map() {
		return this.currentMap;
	}

	convertChar(ch) {
		return this.currentMap ? this.currentMap[ch] : ch;
	}

}
