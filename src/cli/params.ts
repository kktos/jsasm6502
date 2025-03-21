import yargs from "yargs";
import type { Arguments } from "./types";

export function getParams(line: string[]): Arguments {
	const argv = yargs(line)
		.usage("Usage: asm6502 [--listing] [--out filename] filename")
		.version(prg.version)
		.options({
			listing: {
				describe: "with listing output",
				boolean: true,
			},
			symbols: {
				describe: "output symbols table",
				boolean: true,
			},
			segments: {
				describe: "output segments table",
				boolean: true,
			},
			out: {
				describe: "output file name",
				type: "string",
			},
			dir: {
				describe: "source directory",
				type: "string",
			},
			conf: {
				describe: "configuration file",
				type: "string",
			},
		})
		.parseSync();

	const { listing, symbols, segments, dir, out, conf, _ } = argv;

	return {
		listing,
		symbols,
		segments,
		out,
		conf,
		dir,
		src: _[0] as string,
	};
}
