import { VAParseError } from "./errors.class";

export type TMacroParam = {
	name: string;
	isInterpolated?: boolean;
};

export type TMacro = {
	parms: TMacroParam[];
	block: string;
	hasRestParm: boolean;
	wantAlternateSep: boolean;
};

export class MacroManager {
	private macros = new Map<string, TMacro>();

	add(name: string, macro: TMacro) {
		if (this.macros.has(name)) throw new VAParseError(`MACRO: "${name}" is already defined`);

		this.macros.set(name, macro);
	}

	get(name: string) {
		return this.macros.get(name);
	}

	exists(name: string) {
		return !!this.macros.get(name);
	}
}
