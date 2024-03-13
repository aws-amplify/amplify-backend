/**
 * Makes all the properties of the entire nested object partial
 * instead of just the top level properties
 */
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};
