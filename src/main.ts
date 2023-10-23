import { load } from "js-yaml";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import yargs from "yargs";
import { assemble } from "./assembler";
import { pushNumber } from "./pragmas/data.pragma";
import { makeString } from "./pragmas/string.pragma";
import { Options } from "./types/Options";
import { TSegments } from "./compiler.class";

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

type TSegmentItem = [string, number, number, number];
type TSegmentList = TSegmentItem[];
type TConf= {
	segments?: TSegmentList;
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
		segments: (conf?.segments ?? null) as TSegments,
		cpu: "6502",
		console,
	};

	const hexa = (v: number, len = 4) => {
		return `$${v.toString(16).padStart(len, "0").toUpperCase()}`;
	};

	let asmRes;
	try {
		asmRes = assemble(basename(filename), opts);

		if (argv.symbols) console.log("\n", asmRes.symbols.dump());

		if (asmRes.error) {
			throw "";
		}

		let finalCode: unknown[] = [];
		const segmentList: TSegmentList = [];
		for (const name of Object.keys(asmRes.segments)) {
			const segObj = asmRes.obj[name];

			const currPos = finalCode.length;

			if (segObj) finalCode = finalCode.concat(segObj);

			const seg = asmRes.segments[name];
			const segLen = seg.end - seg.start + 1;
			let padLen = 0;
			if ((segObj?.length ?? 0) < segLen && Object.hasOwn(seg, "pad")) {
				padLen = segLen - segObj.length;
				const padBuffer = Array.from({ length: padLen }, () => seg.pad);
				finalCode = finalCode.concat(padBuffer);
			}

			if (argv.segments)
				console.log(
					hexa(currPos, 8),
					": SEGMENT",
					name,
					hexa(segObj?.length ?? 0),
					padLen ? `PAD ${hexa(padLen)}` : "",
				);

			if (argv.segdir) {
				segmentList.push([name, currPos, (segObj?.length ?? 0) + padLen, seg.start]);
			}

			if (argv.dump) asmRes.dump(name);
		}

		if (argv.segdir) {
			const lenBeforeDir = finalCode.length;
			for (const [name, offset, len, org] of segmentList) {
				const recordBuffer = makeString(null, String(name), { charSize: 1, hasLeadingLength: true });
				pushNumber(recordBuffer, { value: offset, type: 0 }, -4);
				pushNumber(recordBuffer, { value: len, type: 0 }, -4);
				pushNumber(recordBuffer, { value: org, type: 0 }, -4);
				const recordSize: number[] = [];
				pushNumber(recordSize, { value: recordBuffer.length + 1, type: 0 }, 1);
				finalCode = finalCode.concat(recordSize.concat(recordBuffer));
			}
			const dirOffset: number[] = [];
			pushNumber(dirOffset, { value: lenBeforeDir, type: 0 }, -4);
			finalCode = finalCode.concat(dirOffset, makeString(null, "DISK", { charSize: 1 }));
		}

		const outFilename = argv.out ? argv.out : "a.out";
		if (finalCode.length) {
			const buffer = Buffer.from(finalCode as number[]);
			writeFileSync(outFilename, buffer);
			console.log("binary output", outFilename);
		} else {
			console.log("no code to save !");
		}
	} catch (err) {
		//err && console.error("ERROR:", err);
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
