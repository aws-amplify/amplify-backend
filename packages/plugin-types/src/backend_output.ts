/**
 * The shape of the config values that defines an Amplify backend.
 *
 * Keys are the construct package name that wrote the output
 */
export type BackendOutput = Record<string, BackendOutputValue>;

export type BackendOutputValue = {
  constructVersion: string;
  data: Record<string, string>;
};
