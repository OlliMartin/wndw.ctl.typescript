import { isNull, isUndefined } from "effect/Predicate";

// 1. npm i isNull
// 2. import isNull from "is-null";
// ...
// SUCCESS ??
export const isNullOrUndefined = (value: unknown): boolean => isNull(value) || isUndefined(value);
