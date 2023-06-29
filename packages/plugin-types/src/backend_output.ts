export type BackendOutputEntry<
  T extends Record<string, string> = Record<string, string>
> = {
  readonly version: string;
  readonly payload: T;
};

export type BackendOutput = Record<string, BackendOutputEntry>;
