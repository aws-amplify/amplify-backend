/**
 * Makes all the properties of the entire nested object partial
 * instead of just the top level properties
 */
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

/**
 * Makes all the properties of the entire nested object partial for Amplify generated configs
 * instead of just the top level properties. Other properties are not changed.
 */
export type DeepPartialAmplifyGeneratedConfigs<T> = {
  [P in keyof T]?: P extends 'analytics' | 'geo' | 'notifications'
    ? T[P]
    :
    (T[P] extends object ? DeepPartialAmplifyGeneratedConfigs<T[P]> : Partial<T[P]>);
};
