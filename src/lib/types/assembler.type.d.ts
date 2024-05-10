import { TSegments, TCodeObj } from "../compiler.class";
import { Dict } from "../dict/dict.class";
import { TExprStackItem } from "../parsers/expression/TExprStackItem.class";
export type TAssemblerResult = {
    symbols: Dict<TExprStackItem>;
    segments: TSegments;
    obj: TCodeObj;
    disasm: string;
    dump: (segmentName: string, bytePerLine?: number) => void;
    error: string | null;
};
