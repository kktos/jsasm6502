import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import yargs from "yargs";

import { assemble, dumpCode, dumpSymbols } from "./6502assembler.js";
import { getHexWord } from "./utils.js";

function readFile(filename) {
	try {
		return readFileSync(rootDir +"/"+ filename).toString();
	} catch(e) {
		// console.error("FATAL ERROR: Unable to readFile "+filename);
		return null;
	}
}

const argv= yargs(process.argv.splice(2))
			.usage('Usage: vasm [--listing] [--out filename] filename')
			.options({
				listing: {
					describe: "with listing output",
					boolean: true
				},
				dump: {
					describe: "with hexdump output",
					boolean: true
				},
				symbols: {
					describe: "with hexdump output",
					boolean: true
				},
				out: {
					describe: "output file name",
				}
			})
			.demandCommand(1)
			.argv;

const filename= argv["_"][0];
const rootDir= dirname(filename);
const opts= {
	readFile,
	listing: argv.listing === true,
	segments: {
		BOOT1: { start: 0x800, end: 0x8FF },
		LOADER: { start: 0xB700, end: 0xBFFF },
		BOOT3: { start: 0xB700, end: 0xB7FF },
		BOOT2: { start: 0x4100, end: 0x45FF },
		WELCOME: { start: 0x0200, end: 0x03FF },
	}
};

assemble(basename(filename), opts)
	.then(ctx => {

		if(ctx.error) {
			console.error(ctx.message);
			return;
		}

		let finalCode= [];
		Object.keys(ctx.segments).forEach( segmentName => {
			if(ctx.code[segmentName])
				finalCode= finalCode.concat(ctx.code[segmentName]);

			const segment= ctx.segments[segmentName];
			console.log("segment", segmentName,
				"$"+getHexWord(segment.start),
				"len", "$"+getHexWord(segment.end-segment.start+1)
			);
			if(argv.dump) {
				const dump= dumpCode(ctx, segmentName, true);
				console.log( dump ? dump : "<empty>\n" );
			}
		});

		if(argv.symbols === true)
			console.log( "SYMBOLS:\n"+dumpSymbols().join("\n") );

		const outFilename= argv.out ? argv.out : "a.out";
		if(finalCode.length) {
			const buffer= Buffer.from( finalCode );
			writeFileSync(outFilename, buffer);
			console.log("binary output", outFilename);
		} else {
			console.log("no code to save !");
		}

	});
