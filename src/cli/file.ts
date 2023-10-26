import { load } from "js-yaml";
import { readFileSync, accessSync } from "node:fs";
import { dirname } from "node:path";
import { TConf } from "./types";
import { ReadFileReturn } from "../types/Options.type";

let rootDir = ".";

export function setRootDir(root: string) {
	rootDir = root;
}

export function isFileExists(path: string) {
	try {
		accessSync(path);
	} catch {
		return false;
	}
	return true;
}

export function readConfFile(path?: string) {
	let confPath = path;
	if (!confPath) {
		confPath = "./jsasm.conf";
		if (!isFileExists(confPath)) return null;
	}

	const conf: TConf | null = readYAMLFile(confPath) as TConf | null;
	if (!conf || typeof conf !== "object") {
		return { conf: null, error: `invalid conf file ${confPath}` };
	}

	return { conf, error: null };
}

export function readFile(filename: string, fromDir?: string, asBin?: boolean): ReadFileReturn {
	try {
		// const includeDir = fromFile ? dirname(fromFile) : "";
		const includeDir = fromDir ?? "";
		const path = (includeDir !== "" ? `${includeDir}/` : "") + filename;
		const content = readFileSync(`${rootDir}/${path}`);
		return {
			path,
			dir: dirname(path),
			content: asBin ? content : content.toString(),
			error: "",
		};
	} catch (e) {
		return {
			path: "",
			dir: "",
			content: "",
			error: (e as Error).message,
		};
	}
}

export function readYAMLFile(filename: string): Record<string, unknown> | boolean | number | string {
	try {
		return load(readFile(filename).content as string) as Record<string, unknown>;
	} catch (e) {
		console.error("readYAMLFile", filename, e);
		return "";
	}
}
