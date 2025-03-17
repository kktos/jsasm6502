import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname } from "node:path";
import type { Options } from "../lib/types/Options.type";
import { link } from "./linker";
import { readFile, parseYAML, setRootDir } from "./file";
import { readConf } from "./conf";
import { name, version } from "../../package.json";
import pc from "./colors";

const assemble = await import("../lib/assembler").then((m) => m.assemble);

declare global {
	var prg: {
		name: string;
		version: string;
	};
}
globalThis.prg = { name, version };

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

console.log(pc.magenta(prg.name), prg.version);

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
const outBasename = `${basename(outFilename, extname(outFilename))}`;

try {
	const asmRes = assemble(basename(filename), opts);

	if (conf.options.symbols) {
		mkdirSync(outDirname, { recursive: true });
		writeFileSync(`${outDirname}/${outBasename}.sym`, asmRes.symbols.dump());
	}

	if (conf.options.listing) {
		mkdirSync(outDirname, { recursive: true });
		for (const disasmFile of asmRes.disasm) {
			const filename = disasmFile.name ? `${basename(disasmFile.name, extname(disasmFile.name))}` : outBasename;
			writeFileSync(`${outDirname}/${filename}.lst`, disasmFile.content);
		}
	}

	if (asmRes.error) {
		process.exit(-1);
	}

	const linkRes = link(asmRes);

	if (conf.options.segments) {
		console.log("");
		console.log(pc.underline("OFFSET    LEN   PAD   SIZE  ADDR  NAME          ."));
		for (const [name, offset, len, padLen, org, size] of linkRes.dir) {
			console.log(
				pc.blue(hexa(offset, 8)),
				// "LEN:",
				pc.blue(hexa(len)),
				// "PAD:",
				padLen ? pc.blue(hexa(padLen)) : "-----",
				// "SIZE:",
				pc.blue(hexa(size)),
				// "ADDR:",
				pc.blue(hexa(org)),
				pc.green(name),
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
	} else {
		console.log("no code to save !");
	}
} catch (err) {
	err && console.error("ERROR:", err);
}
