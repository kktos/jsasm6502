import type { TSegments, TCodeObj } from "../compiler.class";
import type { Dict } from "../dict/dict.class";
import type { TExprStackItem } from "../parsers/expression/TExprStackItem.class";

export type TAssemblerDisasm = Array<{ name: string | null; content: string }>;

export type TAssemblerResult = {
	symbols: Dict<TExprStackItem>;
	segments: TSegments;
	obj: TCodeObj;
	disasm: TAssemblerDisasm;
	dump: (segmentName: string, bytePerLine?: number) => void;
	error: string | null;
};
