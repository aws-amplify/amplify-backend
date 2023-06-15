/**
 * The shape of the config values that defines an Amplify backend
 */
export type AmplifyBackendOutput = Record<
  ConstructPackageName,
  { constructVersion: string; data: Record<string, string> }
>;

/**
 * Alias for a string that represents a construct package name
 */
export type ConstructPackageName = string;
