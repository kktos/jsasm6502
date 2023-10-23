import { TSegments, TCodeObj } from "../compiler.class";
import { Dict } from "../dict.class";

export type TAssemblerResult= {
	symbols: Dict;
	segments: TSegments;
	obj: TCodeObj;
	dump: (segmentName: string, bytePerLine?: number) => void;
	error: string | null;
};
