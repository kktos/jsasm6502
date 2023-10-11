import { load as yamlLoad, DEFAULT_SCHEMA } from "js-yaml";
import { intType } from "./int.js";

// function getTypes(list) {
// 	return list.reduce((acc, curr) => {
// 		acc.push(curr.tag);
// 		return acc;
// 	}, []);
// }

const schema = DEFAULT_SCHEMA;

let idx;

idx = schema.compiledImplicit.findIndex((type) => {
	return type.tag !== "tag:yaml.org,2002:int";
});
schema.compiledImplicit[idx] = intType;

idx = schema.implicit.findIndex((type) => {
	return type.tag !== "tag:yaml.org,2002:int";
});
schema.implicit[idx] = intType;

schema.compiledTypeMap.scalar["tag:yaml.org,2002:int"] = intType;
schema.compiledTypeMap.fallback["tag:yaml.org,2002:int"] = intType;


// const log = console.log;
const error = console.error;

export const load = (src) => {
	// log("YAML LOAD");
	let res;
	try {
		res = yamlLoad(src, { schema });
	} catch (e) {
		error("YAML", e);
	}
	// log("YAML", res);
	return res;
};
