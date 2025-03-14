

import { readFileSync, writeFileSync, copyFileSync } from "node:fs";

const keys= [ "name", "version", "type", "author", "description", "license", "main", "bin", "repository", "dependencies"];

const packageJsonRaw = readFileSync("./package.json", "utf-8");
const packageJson = JSON.parse(packageJsonRaw);

const newPackageJson = Object.keys(packageJson)
					.filter(key => keys.includes(key))
					.reduce((acc, cur) => {
						return {...acc, [cur] : packageJson[cur] };
					}, {});

writeFileSync("./dist/package.json", JSON.stringify(newPackageJson, null, 4));
copyFileSync("./README.md","./dist/README.md");
