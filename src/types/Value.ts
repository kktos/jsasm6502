export type TValueType = number | string | object | boolean | null;

export interface TValue {
	type: number | null;
	value: TValueType;
}
