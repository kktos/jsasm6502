import { TSegmentsConf } from "../types/Options.type";

export interface Arguments {
	listing?: boolean;
	dump?: boolean;
	symbols?: boolean;
	segments?: boolean;
	segdir?: boolean;
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
		segdir: boolean;
		symbols: boolean;
		listing: boolean;
	};
};
