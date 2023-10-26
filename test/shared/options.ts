import { load } from "../../src/helpers/asm-yaml";
import { Options } from "../../src/types/Options.type";

let consoleOutput= "";
export const opts: Options & { output: string }= {
	readFile: (filename: string, fromFile?: string, asBin?: boolean) => {
		return { path: "", dir: "", content: filename, error:"" };
	},
	YAMLparse: (s) =>load(s),
	listing: false,
	segments: null,
	console: {
		log: (s?: string | null) => {
			consoleOutput += `${s}\n`;
		},
		error: (s?: string | null) => {
			consoleOutput += `${s}\n`;
		},
		warn: (s?: string | null) => {
			consoleOutput += `${s}\n`;
		},
	},

	get output(): string { return consoleOutput; },
	set output(v: string) { consoleOutput= v; }
};
