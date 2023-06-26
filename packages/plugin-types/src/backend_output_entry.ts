export type SchemaIdentifier = {
  schemaName: string;
  schemaVersion: number;
};

export type BackendOutputEntry<
  T extends Record<string, string> = Record<string, string>
> = {
  readonly schemaIdentifier: SchemaIdentifier;
  readonly payload: T;
};
