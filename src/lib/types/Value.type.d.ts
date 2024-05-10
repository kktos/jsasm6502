export type TValueType = number | string | Record<string, unknown> | Array<unknown> | boolean | null;
export interface TValue {
    type: number | null;
    value: TValueType;
}
