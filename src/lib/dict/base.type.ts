import { IExprItem } from "../types/ExprItem.type";

export const NS_GLOBAL = "GLOBAL";

export type TDict = object & IExprItem;

export type TNamespaceKey = string | symbol;
export type TNamespace<T> = Record<TNamespaceKey, T>;
export type TNamespaceDict<T> = Record<string, TNamespace<T>>;
