/**
 * This utility allows us to expand nested types in auto complete prompts.
 * @example
 * type OtherType = {
 *  property1: string;
 *  property2: number;
 * }
 * type SomeType = {
 *  property2: Expand<OtherType>;
 * }
 */
export type Expand<T> = T extends infer O
  ? {
      [K in keyof O]: O[K];
    }
  : never;
