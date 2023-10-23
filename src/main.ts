import { load } from "js-yaml";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import yargs from "yargs";
import { assemble } from "./assembler";
import { Options, TSegmentsConf } from "./types/Options";
import * as path from "node:path";
import { link } from "./linker";

interface Arguments {
	listing?: boolean;
	dump?: boolean;
	symbols?: boolean;
	segments?: boolean;
	segdir?: boolean;
	out?: string;
	conf?: string;
	_: (string | number)[];
}

type TConf = {
	segments?: TSegmentsConf;
	src?: string;
};


let rootDir: string;

function readFile(filename: string, fromFile?: string, asBin?: boolean) {
	try {
		const includeDir = fromFile ? dirname(fromFile) : "";
		const fullpath = (includeDir !== "" ? `${includeDir}/` : "") + filename;
		const content = readFileSync(`${rootDir}/${fullpath}`);
		return { path: fullpath, content: asBin ? content : content.toString(), error: "" };
	} catch (e) {
		// console.error("FATAL ERROR: Unable to readFile "+fullpath);
		return { error: (e as Error).message, path: "", content: "" };
	}
}

function readYAMLFile(filename: string): Record<string, unknown> | boolean | number | string {
	try {
		return load(readFile(filename).content as string) as Record<string, unknown>;
	} catch (e) {
		console.error("readYAMLFile", filename, e);
		return "";
	}
}

function main() {
	rootDir = ".";

	console.log("jsAsm v.01");

	let conf: TConf | null = null;
	if (argv.conf) {
		conf = readYAMLFile(argv.conf) as TConf | null;
		if (!conf || typeof conf !== "object") {
			console.error(`unable to read conf file ${argv.conf}`);
			process.exit(-1);
		}
	}

	const filename = argv._[0] !== undefined ? String(argv._[0]) : conf?.src;
	if (!filename) {
		console.error("need a source file to assemble");
		process.exit(-1);
	}

	rootDir = dirname(filename);

	const opts: Options = {
		readFile,
		YAMLparse: readYAMLFile,
		listing: argv.listing === true,
		segments: conf?.segments ?? null,
		cpu: "6502",
		console,
	};

	const hexa = (v: number, len = 4) => {
		return `$${v.toString(16).padStart(len, "0").toUpperCase()}`;
	};

	const outFilename = argv.out ? argv.out : "a.out";
	const outBasename = path.basename(outFilename, path.extname(outFilename));

	let asmRes;
	try {
		asmRes = assemble(basename(filename), opts);

		if (argv.symbols) {
			writeFileSync(`${outBasename}.symbols`, asmRes.symbols.dump());
		}

		if (asmRes.error) {
			process.exit(-1);
		}

		const linkRes = link(asmRes, { hasSegmentDirectory: !!argv.segdir});

		if (argv.segments) {
			console.log("");
			for (const [name, offset, len, padLen, org, size] of linkRes.dir) {
				console.log(
					hexa(offset, 8),
					"LEN:",hexa(len),
					"PAD:",hexa(padLen),
					"SIZE:",hexa(size),
					"ADDR:",hexa(org),
					name,
				);

			}
		}

		// if (argv.dump) asmRes.dump(name);

		if (linkRes.finalCode.length) {
			const buffer = Buffer.from(linkRes.finalCode as number[]);
			writeFileSync(outFilename, buffer);
			console.log("binary output", outFilename);
		} else {
			console.log("no code to save !");
		}
	} catch (err) {
		err && console.error("ERROR:", err);
	}
}

const argv: Arguments = yargs(process.argv.splice(2))
	.usage("Usage: jsasm [--listing] [--out filename] filename")
	.options({
		listing: {
			describe: "with listing output",
			boolean: true,
			default: true,
		},
		dump: {
			describe: "with hexdump output",
			boolean: true,
		},
		symbols: {
			describe: "output symbols table",
			boolean: true,
			default: false,
		},
		segments: {
			describe: "output segments table",
			boolean: true,
			default: false,
		},
		segdir: {
			describe: "output segments dir in the output file",
			boolean: true,
			default: false,
		},
		out: {
			describe: "output file name",
			type: "string",
		},
		conf: {
			describe: "segments configuration file",
			type: "string",
		},
	})
	// .demandCommand(1)
	.parseSync();

// console.time("asm");
// for (let index = 0; index < 1000; index++) {
// 	main(argv);
// }
// console.timeEnd("asm");

main();
