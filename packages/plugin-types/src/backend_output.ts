export type BackendOutputEntry<T = Record<string, string>> = {
  readonly version: string;
  readonly payload: T;
};

export type BackendOutput<T = Record<string, string>> = Record<
  string,
  BackendOutputEntry<T>
>;
