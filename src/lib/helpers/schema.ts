type Dict = Record<string, unknown>;

type SchemaEntry = {
	type: string;
	isRequired?: boolean;
};
type SchemaDict = Record<string, SchemaEntry>;

export function validateSchema(conf: Dict, schema: SchemaDict) {
	const validate = (obj: Dict, schema: SchemaDict) => {
		for (const key in schema) {
			if (!Object.hasOwn(obj, key)) {
				if (schema[key].isRequired) throw new TypeError(`CONF.string: Missing required key "${key}"`);
				continue;
			}

			const type = typeof obj[key];
			if (type !== schema[key].type)
				throw new TypeError(`CONF.string: Invalid type for key ${key}:${schema[key].type} -> ${type} `);
		}
	};

	return validate(conf, schema);
}
