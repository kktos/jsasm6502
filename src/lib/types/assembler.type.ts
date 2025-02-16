import type { TSegments, TCodeObj } from "../compiler.class";
import type { Dict } from "../dict/dict.class";
import type { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

export type TAssemblerResult = {
	symbols: Dict<TExprStackItem>;
	segments: TSegments;
	obj: TCodeObj;
	disasm: string;
	dump: (segmentName: string, bytePerLine?: number) => void;
	error: string | null;
};
