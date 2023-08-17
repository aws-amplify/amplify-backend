type Prettify<T> = T extends () => {}
  ? () => ReturnType<T>
  : T extends object
  ? { [P in keyof T]: Prettify<T[P]> }
  : T;

export type SelectionSet<T, SS extends (keyof T)[]> = Prettify<{
  [FieldName in keyof T as FieldName extends SS[number]
    ? FieldName
    : never]: T[FieldName];
}>;
