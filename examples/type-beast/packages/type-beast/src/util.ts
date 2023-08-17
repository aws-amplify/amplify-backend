/**
 * Replaces the value of a key in a complex generic type param
 * @typeParam T - ModelType type param
 * @typeParam SetKey - name of the key whose value will be replaced
 * @typeParam Val - the value to set
 *
 * @example
 * T = { fields: {}, identifier: "id"[] }
 * type Modified = SetTypeSubArg<T, "identifier", "customId"[]>
 * Modified => { fields: {}, identifier: "customId"[] }
 */
export type SetTypeSubArg<T, SetKey extends keyof T, Val> = {
  [Property in keyof T]: SetKey extends Property ? Val : T[Property];
};

export type Prettify<T> = T extends () => {}
  ? () => ReturnType<T>
  : T extends object
  ? { [P in keyof T]: Prettify<T[P]> }
  : T;

declare const brand: unique symbol;
export type Brand<T, TBrand extends string> = T & {
  [brand]: TBrand;
};

/**
 * @typeParam U - Union Type
 * @returns Intersection type
 *
 * @example
 * UnionToIntersection<{a: 1} | {b: 2}> => {a: 1} & {b: 2}
 */
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * @typeParam U - Union Type
 * @returns Union of non-empty types
 *
 * @example
 * ExcludeEmpty<{a: 1} | {} | {b: 2}> => {a: 1} | {b: 2}
 */
export type ExcludeEmpty<U> = U extends U ? ({} extends U ? never : U) : never;

export type Expect<T extends true> = T;
export type ExpectTrue<T extends true> = T;
export type ExpectFalse<T extends false> = T;
export type IsTrue<T extends true> = T;
export type IsFalse<T extends false> = T;

export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? true
  : false;
export type NotEqual<X, Y> = true extends Equal<X, Y> ? false : true;
export type IsAny<T> = 0 extends 1 & T ? true : false;
export type NotAny<T> = true extends IsAny<T> ? false : true;

export type Debug<T> = { [K in keyof T]: T[K] };
