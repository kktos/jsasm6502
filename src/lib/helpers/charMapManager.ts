import type { TDict } from "../dict/base.type";
import type { Dict } from "../dict/dict.class";
import { TOKEN_TYPES } from "../lexer/token.class";
import { VAParseError } from "./errors.class";
import { getHexWord } from "./utils";

export class CharMapManager<T extends TDict> {
	private symbols;
	private _currentMap: number[] | null = null;

	constructor(symbols: Dict<T>) {
		this.symbols = symbols;
	}

	map(mapName: string | null) {
		if (mapName === null) {
			this._currentMap = null;
			return;
		}

		const name = `CHARMAP_${mapName}`;
		const value = this.symbols.get(name);
		// if (!value) value = this.symbols.get(name, NS_GLOBAL);
		if (!value) throw new VAParseError(`OPTION: unknown charmap ${mapName}`);
		if (value.type !== TOKEN_TYPES.ARRAY) {
			throw new VAParseError(`OPTION: invalid charmap ${getHexWord(value.type ?? 0)}, need an array`);
		}
		const charList = value.value as number[];
		if (charList.length !== 256) throw new VAParseError("OPTION: invalid charmap, need 256 values");

		this._currentMap = charList;
	}

	currentMap() {
		return this._currentMap;
	}

	convertChar(ch: number) {
		return this._currentMap ? this._currentMap[ch] : ch;
	}
}
