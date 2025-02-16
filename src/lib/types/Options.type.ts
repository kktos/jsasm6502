import type { TSegments } from "../compiler.class";

export type ReadFileReturn = {
	error: string;
	path: string;
	dir: string;
	content: string | Buffer;
};
export type ReadFileFunction = (filename: string, fromFile?: string, asBin?: boolean) => ReadFileReturn;

export type TConsole = {
	log: (s?: string | null) => void;
	error: (s?: string | null) => void;
	warn: (s?: string | null) => void;
};

export type TSegmentsConf = TSegments;

export type Options = {
	cpu?: string;
	listing: boolean;

	console: TConsole;
	segments: TSegments | null;

	readFile: ReadFileFunction;

	YAMLparse: (filename: string) => Record<string, unknown> | boolean | number | string;
};
