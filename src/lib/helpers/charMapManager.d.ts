import { TDict } from "../dict/base.type";
import { Dict } from "../dict/dict.class";
export declare class CharMapManager<T extends TDict> {
    private symbols;
    private _currentMap;
    constructor(symbols: Dict<T>);
    map(mapName: string | null): void;
    currentMap(): number[];
    convertChar(ch: number): number;
}
