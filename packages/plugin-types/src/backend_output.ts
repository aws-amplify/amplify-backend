export type BackendOutputEntry<
  T extends Record<string, string> = Record<string, string>
> = {
  readonly version: string;
  readonly payload: T;
};

export type BackendOutput = Record<string, BackendOutputEntry>;

export type AppendableBackendOutputEntry = {
  readonly version: string;
  addToPayload: (key: string, value: string) => void;
}
