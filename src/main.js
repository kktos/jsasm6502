import { load } from "js-yaml";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import yargs from "yargs";
import { assemble } from "./assembler.js";
import { pushNumber } from "./pragmas/data.pragma.js";
import { makeString } from "./pragmas/string.pragma.js";

function readFile(filename, fromFile, asBin) {
	try {
		let includeDir= fromFile ? dirname(fromFile) : "";
		filename= (includeDir!="" ? includeDir +"/" : "") + filename;
		const content= readFileSync(rootDir +"/"+ filename);
		return {path: filename, content: asBin ? content : content.toString()};
	} catch(e) {
		// console.error("FATAL ERROR: Unable to readFile "+filename);
		return {error: e.message};
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
			.usage('Usage: jsasm [--listing] [--out filename] filename')
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
				segdir: {
					describe: "output segments dir in the output file",
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
	segments: conf.segments,
	cpu: "6502"
};

const hexa= (v, len=4)=> {
	return "$"+v.toString(16).padStart(len,"0").toUpperCase();
}

let asmRes;
try {
	asmRes= assemble(basename(filename), opts);

	if(argv.symbols)
		console.log( asmRes.symbols.dump() );

	let finalCode= [];
	let segmentsDir= [];
	Object.keys(asmRes.segments).forEach(name => {
		const segObj= asmRes.obj[name];

		const currPos= finalCode.length;

		if(segObj)
			finalCode= finalCode.concat(segObj);

		const seg= asmRes.segments[name];
		const segLen= seg.end - seg.start + 1;
		let padLen= 0;
		if((segObj?.length ?? 0) < segLen && seg.hasOwnProperty("pad")) {
			padLen= segLen - segObj.length;
			const padBuffer= Array.from({length: padLen}, () => seg.pad)
			finalCode= finalCode.concat(padBuffer);
		}

		if(argv.segments)
			console.log(hexa(currPos, 8), ": SEGMENT", name, hexa(segObj?.length ?? 0), padLen ? "PAD "+hexa(padLen) : "");

		if(argv.segdir) {
			segmentsDir.push([name, currPos, (segObj?.length ?? 0)+padLen, seg.start]);
		}

		if(argv.dump)
			asmRes.dump(name);
	});

	if(argv.segdir) {
		const lenBeforeDir= finalCode.length;
		segmentsDir.forEach(([name, offset, len, org]) => {
			const recordBuffer= makeString(null, name, {hasLeadingLength:true});
			pushNumber(recordBuffer, {value: offset}, -4);
			pushNumber(recordBuffer, {value: len}, -4);
			pushNumber(recordBuffer, {value: org}, -4);
			const recordSize= [];
			pushNumber(recordSize, {value: recordBuffer.length+1}, 1);
			finalCode= finalCode.concat(recordSize.concat(recordBuffer));
		});
		const dirOffset= [];
		pushNumber(dirOffset, {value: lenBeforeDir}, -4);
		finalCode= finalCode.concat(dirOffset, makeString(null, "DISK"));
	}

	const outFilename= argv.out ? argv.out : "a.out";
	if(finalCode.length) {
		const buffer= Buffer.from( finalCode );
		writeFileSync(outFilename, buffer);
		console.log("binary output", outFilename);
	} else {
		console.log("no code to save !");
	}

}
catch(err) {
	console.error("ERROR:", err);
}
