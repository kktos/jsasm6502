import type { TSegmentsConf } from "../lib/types/Options.type";

export interface Arguments {
	listing?: boolean;
	dump?: boolean;
	symbols?: boolean;
	segments?: boolean;
	out?: string;
	conf?: string;
	src?: string;
}

export type TConf = {
	segments?: TSegmentsConf;
	src: string;
	out: string;
	options: {
		segments: boolean;
		symbols: boolean;
		listing: boolean;
	};
	link: {
		post: string;
	};
};

export class SchemaDict {
	constructor(obj: object) {
		const dst = this as Record<string, unknown>;
		const src = obj as Record<string, unknown>;
		for (const key in obj) dst[key] = src[key];
	}
}

export const confSchema = {
	src: "string",
	out: "string",
	options: {
		segments: "boolean",
		symbols: "boolean",
		listing: "boolean",
	},
	link: {
		post: "string",
	},
	segments: new SchemaDict({
		start: "number",
		end: "number",
		pad: "number",
	}),
};
