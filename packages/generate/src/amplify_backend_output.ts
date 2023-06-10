/**
 * The shape of the config values that defines an Amplify backend
 */
export type AmplifyBackendOutput = Record<
  ConstructPackageName,
  { constructVersion: string; data: Record<string, string> }
>;

type ConstructPackageName = string;
