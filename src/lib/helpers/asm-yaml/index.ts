import { load as yamlLoad, DEFAULT_SCHEMA } from "js-yaml";
import { intType } from "./int";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const schema: any = DEFAULT_SCHEMA;

let idx: number;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
idx = schema.compiledImplicit.findIndex((type: any) => {
	return type.tag !== "tag:yaml.org,2002:int";
});
schema.compiledImplicit[idx] = intType;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
idx = schema.implicit.findIndex((type: any) => {
	return type.tag !== "tag:yaml.org,2002:int";
});
schema.implicit[idx] = intType;

schema.compiledTypeMap.scalar["tag:yaml.org,2002:int"] = intType;
schema.compiledTypeMap.fallback["tag:yaml.org,2002:int"] = intType;

// const log = console.log;
const error = console.error;

export const load = (src: string) => {
	// log("YAML LOAD");
	let res: unknown;
	try {
		res = yamlLoad(src, { schema });
	} catch (e) {
		error("YAML", e);
	}
	// log("YAML", res);
	return res;
};
