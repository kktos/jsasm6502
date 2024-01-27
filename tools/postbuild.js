
import * as json from "../package.json" assert { type: "json" };
import { writeFileSync, copyFileSync } from "node:fs";

const keys= [ "name", "version", "type", "author", "description", "license", "main", "bin", "repository", "dependencies"];

const packageJson = Object.keys(json.default)
					.filter(key => keys.includes(key))
					.reduce((acc, cur) => {
						return {...acc, [cur] : json.default[cur] };
					}, {});

writeFileSync("./dist/package.json", JSON.stringify(packageJson, null, 4));
copyFileSync("./README.md","./dist/README.md");
