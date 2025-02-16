import type { TValueType } from "./Value.type";

type TExtra = {
	file?: string;
	line?: number;
	isVariable: boolean;
	exported?: number;
};

export type IExprItem = {
	get type(): number | null;
	get value(): TValueType;
	extra?: TExtra;
};
