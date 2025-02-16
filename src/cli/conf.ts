import { readConfFile } from "./file";
import { getParams } from "./params";
import { SchemaDict, type TConf, confSchema } from "./types";

export function readConf(args: string[]) {
	const argv = getParams(args);

	const confRez = readConfFile(argv.conf);
	if (confRez?.error) {
		console.error(confRez?.error);
		process.exit(-1);
	}

	const tmpConf = confRez?.conf;

	if (tmpConf) {
		try {
			validateSchema(tmpConf, confSchema);
		} catch (e) {
			console.log("\n", tmpConf, "\n");
			return { error: (e as Error).message };
		}
	}

	const conf = {
		src: argv.src ?? tmpConf?.src,
		out: argv.out ?? tmpConf?.out ?? "./a.out",
		segments: tmpConf?.segments,
		link: {
			post: tmpConf?.link?.post,
		},
		options: {
			segments: argv.segments ?? tmpConf?.options?.segments ?? false,
			symbols: argv.symbols ?? tmpConf?.options?.symbols ?? false,
			listing: argv.listing ?? tmpConf?.options?.listing ?? true,
		},
	};

	return { conf };
}
type Dict = Record<string, unknown>;
function validateSchema(conf: TConf, schema: Dict) {
	const validate = (obj: Dict, schema: Dict) => {
		for (const key in schema) {
			if (!Object.hasOwn(obj, key)) continue;
			const type = typeof obj[key];
			switch (typeof schema[key]) {
				case "string":
					if (type !== schema[key])
						throw new TypeError(`CONF.string: Invalid type for key ${key}:${schema[key]} -> ${type} `);
					break;
				case "object":
					if (type !== "object")
						throw new TypeError(`CONF.object: Invalid type for key ${key}:${schema[key]} -> ${type} `);
					if (schema[key] instanceof SchemaDict) {
						const dict = obj[key] as Dict;
						for (const entry in dict) {
							validate(dict[entry] as Dict, schema[key] as Dict);
						}
					}
					validate(obj[key] as Dict, schema[key] as Dict);
					break;
			}
		}
	};

	return validate(conf, schema);
}
