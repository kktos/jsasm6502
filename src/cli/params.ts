import yargs from "yargs";
import { Arguments } from "./types";

export function getParams(line: string[]): Arguments {
	const argv = yargs(line)
		.usage("Usage: jsasm [--listing] [--out filename] filename")
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
			segdir: {
				describe: "output segments dir in the output file",
				boolean: true,
			},
			out: {
				describe: "output file name",
				type: "string",
			},
			conf: {
				describe: "configuration file",
				type: "string",
			},
		})
		.parseSync();

	const { listing, symbols, segments, segdir, out, conf, _ } = argv;

	return {
		listing,
		symbols,
		segments,
		segdir,
		out,
		conf,
		src: _[0] as string,
	};
}
