// type ReadFileError= { error: string };
// type ReadFileReturnBuffer= ReadFileError & { path: string; content: Buffer };
// type ReadFileReturnString= ReadFileError & { path: string; content: string };
// type ReadFileFunction= <T extends boolean>(filename: string, fromFile?: string, asBin?: T) => (T extends true ? ReadFileReturnBuffer : ReadFileReturnString);

import { TSegments } from "../compiler.class";

type ReadFileReturnString = {
	error: string;
	path: string;
	content: string | Buffer;
};
type ReadFileFunction = (filename: string, fromFile?: string, asBin?: boolean) => ReadFileReturnString;

export type TConsole = {
	log: (s?: string | null) => void;
	error: (s?: string | null) => void;
	warn: (s?: string | null) => void;
};

export type Options = {
	cpu?: string;
	listing: boolean;

	console: TConsole;
	segments: TSegments;

	readFile: ReadFileFunction;

	YAMLparse: (filename: string) => Record<string, unknown> | boolean | number | string;
};
