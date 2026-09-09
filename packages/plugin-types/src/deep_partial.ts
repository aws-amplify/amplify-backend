/**
 * Represents a type that allows partial deep cloning of an object.
 * The `DeepPartial` type recursively makes all properties of `T` optional.
 * If a property is an object, it will also be made partially optional.
 * @template T - The type of the object to make partially optional.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Makes all the properties of the entire nested object partial for Amplify generated configs
 * instead of just the top level properties. Other properties are not changed.
 */
export type DeepPartialAmplifyGeneratedConfigs<T> = {
  [P in keyof T]?: P extends 'auth' | 'data' | 'storage'
    ? T[P] extends object
      ? DeepPartialAmplifyGeneratedConfigs<T[P]>
      : Partial<T[P]>
    : T[P];
};
