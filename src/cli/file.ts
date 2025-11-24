import { accessSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { load } from "../lib/helpers/asm-yaml";
import type { ReadFileReturn } from "../lib/types/Options.type";
import type { TConf } from "./types";

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

	const yaml = readFile(confPath);
	const conf: TConf | null = parseYAML(yaml.content as string) as TConf | null;
	if (!conf || typeof conf !== "object") {
		return { conf: null, error: `invalid conf file ${confPath}` };
	}

	return { conf, error: null };
}

export function readFile(filename: string, fromDir?: string, asBin?: boolean): ReadFileReturn {
	try {
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

export function parseYAML(yaml: string): Record<string, unknown> | boolean | number | string {
	try {
		return load(yaml) as Record<string, unknown>;
	} catch (e) {
		console.error("parseYAML", e);
		return "";
	}
}
