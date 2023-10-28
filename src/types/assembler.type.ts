import { TSegments, TCodeObj } from "../compiler.class";
import { Dict } from "../dict.class";

export type TAssemblerResult = {
	symbols: Dict;
	segments: TSegments;
	obj: TCodeObj;
	disasm: string;
	dump: (segmentName: string, bytePerLine?: number) => void;
	error: string | null;
};
