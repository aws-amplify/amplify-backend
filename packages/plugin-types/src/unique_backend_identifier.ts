/**
 * Tuple of values that uniquely identifies a deployed backend.
 * Used to generate stack names for deployments
 */
export type UniqueBackendIdentifier = {
  /**
   * For Amplify branch environments, this is the Amplify app id
   * For sandbox deployments, this is a concatenation of package.json#name and the current local username
   */
  appId: string;
  /**
   * For amplify branch deployments, this is the branch name.
   * For sandbox deployments, this is the string literal "sandbox"
   */
  branchName: string;
};
