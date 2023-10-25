type Kebab<
  T extends string,
  A extends string = ''
> = T extends `${infer F}${infer R}`
  ? Kebab<R, `${A}${F extends Lowercase<F> ? '' : '-'}${Lowercase<F>}`>
  : A;

export type ArgumentsKebabCase<T> = {
  [K in keyof T as K extends string ? Kebab<K> : K]: T[K];
};
