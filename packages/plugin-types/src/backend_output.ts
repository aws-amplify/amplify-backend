export type BackendOutputEntry<
  T extends Record<string, string> = Record<string, string>
> = {
  readonly version: number;
  readonly payload: T;
};

export type BackendOutput = Record<string, BackendOutputEntry>;
