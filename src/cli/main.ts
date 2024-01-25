import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname } from "node:path";
import { assemble } from "../lib/assembler";
import { Options } from "../lib/types/Options.type";
import { link } from "./linker";
import { readFile, parseYAML, setRootDir } from "./file";
import { readConf } from "./conf";
import { name, version } from "../../package.json";

const { conf, error } = readConf(process.argv.splice(2));
if (!conf) {
	console.error(`${error}\n`);
	process.exit(-1);
}

const filename = conf.src;
if (!filename) {
	console.error("need a source file to assemble\n");
	process.exit(-1);
}

console.log(name, version);

setRootDir(dirname(filename));

const opts: Options = {
	readFile,
	YAMLparse: parseYAML,
	listing: conf.options.listing,
	segments: conf.segments ?? null,
	console,
};

const hexa = (v: number, len = 4) => {
	return `$${v.toString(16).padStart(len, "0").toUpperCase()}`;
};

const outFilename = conf.out;
const outDirname = dirname(outFilename);
const outBasename = `${outDirname}/${basename(outFilename, extname(outFilename))}`;

try {
	const asmRes = assemble(basename(filename), opts);

	if (conf.options.symbols) {
		mkdirSync(outDirname, { recursive: true });
		writeFileSync(`${outBasename}.sym`, asmRes.symbols.dump());
	}

	if (conf.options.listing) {
		mkdirSync(outDirname, { recursive: true });
		writeFileSync(`${outBasename}.lst`, asmRes.disasm);
	}

	if (asmRes.error) {
		process.exit(-1);
	}

	const linkRes = link(asmRes);

	if (conf.options.segments) {
		console.log("");
		for (const [name, offset, len, padLen, org, size] of linkRes.dir) {
			console.log(
				hexa(offset, 8),
				"LEN:",
				hexa(len),
				"PAD:",
				padLen ? hexa(padLen) : "-----",
				"SIZE:",
				hexa(size),
				"ADDR:",
				hexa(org),
				name,
			);
		}
	}

	let bin = linkRes.finalCode;

	if (conf.link.post) {
		const m = await import(`file://${process.cwd()}/${conf.link.post}`);
		const res = m?.default?.(bin, linkRes.dir);
		if (res && (typeof res !== "object" || !Array.isArray(res.bin)))
			throw "linker post script needs to return a valid object { bin: [...] }";

		bin = res.bin;
	}

	if (bin.length) {
		const buffer = Buffer.from(bin as number[]);
		mkdirSync(outDirname, { recursive: true });
		writeFileSync(outFilename, buffer);
		// console.log("binary output", outFilename);
	} else {
		console.log("no code to save !");
	}
} catch (err) {
	err && console.error("ERROR:", err);
}
