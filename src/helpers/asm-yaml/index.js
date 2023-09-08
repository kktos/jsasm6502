import { load as yamlLoad, DEFAULT_SCHEMA } from "js-yaml";
import { intType } from "./int.js";

function getTypes(list) {
	return list.reduce((acc, curr)=> { acc.push( curr.tag ); return acc; }, []);
}

let schema = DEFAULT_SCHEMA;

if(1) {

	let idx;

	// schema.compiledImplicit= schema.compiledImplicit.filter( (type) => { return type.tag !== "tag:yaml.org,2002:int" } );
	idx= schema.compiledImplicit.findIndex((type) => { return type.tag !== "tag:yaml.org,2002:int" });
	schema.compiledImplicit[idx]= intType;

	// schema.implicit= schema.implicit.filter( (type) => { return type.tag !== "tag:yaml.org,2002:int" } );
	idx= schema.implicit.findIndex((type) => { return type.tag !== "tag:yaml.org,2002:int" });
	schema.implicit[idx]= intType;

	schema.compiledTypeMap.scalar["tag:yaml.org,2002:int"]= intType;
	schema.compiledTypeMap.fallback["tag:yaml.org,2002:int"]= intType;


// console.log("compiledImplicit");
// console.log(getTypes(schema.compiledImplicit));
// console.log("implicit");
// console.log(getTypes(schema.implicit));
// console.log("explicit");
// console.log(getTypes(schema.explicit));
// console.log("compiledExplicit");
// console.log(getTypes(schema.compiledExplicit));
// console.log("compiledTypeMap.scalar");
// console.log(Object.keys(schema.compiledTypeMap.scalar));
// console.log("compiledTypeMap.fallback");
// console.log(Object.keys(schema.compiledTypeMap.fallback));

// scalar fallback

// schema.implicit= schema.implicit.filter( (type) => { return type.tag !== "tag:yaml.org,2002:int" } );
// schema.compiledImplicit= schema.compiledImplicit.filter( (type) => { return type.tag !== "tag:yaml.org,2002:int" } );

// console.log("compiledImplicit");
// console.log(schema.compiledImplicit.filter( (type) => { return type.tag === "tag:yaml.org,2002:int" } ));

// schema = schema.extend(intType);
}

const log= console.log;
const error= console.error;

export const load = (src) => {
	log("YAML LOAD");

	let res;

	try {
		res= yamlLoad(src, { schema });
	}
	catch(e) {
		error("YAML", e);
	}

	log("YAML", res);

	return res;
};
