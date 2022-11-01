import { load } from "js-yaml";
import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import yargs from "yargs";

import { assemble } from "./main.js";

function readFile(filename, fromFile, asBin) {
	try {
		let includeDir= fromFile ? dirname(fromFile) : "";
		filename= (includeDir!="" ? includeDir +"/" : "") + filename;
		const content= readFileSync(rootDir +"/"+ filename);
		return {path: filename, content: asBin ? content : content.toString()};
	} catch(e) {
		// console.error("FATAL ERROR: Unable to readFile "+filename);
		return null;
	}
}

function readYAMLFile(filename) {
	try {
		return load( readFile(filename).content );
	} catch(e) {
		console.error("readYAMLFile", filename, e);
		return null;
	}
}

const argv= yargs(process.argv.splice(2))
			.usage('Usage: vasm [--listing] [--out filename] filename')
			.options({
				listing: {
					describe: "with listing output",
					boolean: true,
					default: true
				},
				dump: {
					describe: "with hexdump output",
					boolean: true
				},
				symbols: {
					describe: "output symbols table",
					boolean: true,
					default: false
				},
				segments: {
					describe: "output segments table",
					boolean: true,
					default: false
				},
				out: {
					describe: "output file name",
				},
				conf: {
					describe: "segments configuration file",
				}
			})
			.demandCommand(1)
			.argv;

let rootDir= ".";
let conf= null;
if(argv.conf) {
	conf= readYAMLFile(argv.conf);
	if(!conf) {
		console.error("unable to read conf file "+argv.conf);
		process.exit(-1);
	}
}

const filename= argv["_"][0];
rootDir= dirname(filename);

const opts= {
	readFile,
	YAMLparse: load,
	listing: argv.listing === true,
	segments: conf.segments
};

assemble(basename(filename), opts);

	// .then(ctx => {

	// 	if(ctx.error) {
	// 		console.error(ctx.message);
	// 		return;
	// 	}

	// 	let finalCode= [];
	// 	Object.keys(ctx.segments).forEach( segmentName => {
	// 		if(ctx.code[segmentName])
	// 			finalCode= finalCode.concat(ctx.code[segmentName]);

	// 		if(argv.segments) {
	// 			const segment= ctx.segments[segmentName];
	// 			console.log(
	// 				"segment",
	// 				"addr $" + getHexWord(segment.start),
	// 				"len $" + getHexWord(segment.end-segment.start+1),
	// 				segmentName
	// 			);
	// 			if(argv.dump) {
	// 				const dump= dumpCode(ctx, segmentName, true);
	// 				console.log( dump ? dump : "<empty>\n" );
	// 			}
	// 		}
	// 	});

	// 	if(argv.symbols === true)
	// 		console.log( "SYMBOLS:\n"+dumpSymbols().join("\n") );

	// 	const outFilename= argv.out ? argv.out : "a.out";
	// 	if(finalCode.length) {
	// 		const buffer= Buffer.from( finalCode );
	// 		writeFileSync(outFilename, buffer);
	// 		console.log("binary output", outFilename);
	// 	} else {
	// 		console.log("no code to save !");
	// 	}

	// });
