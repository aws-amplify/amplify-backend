/**
 * Tuple of values that uniquely identifies a deployed backend.
 * Used to generate stack names for deployments
 */
export type UniqueDeploymentIdentifier = {
  /**
   * For Amplify branch deployments, this is the Amplify app name.
   * For sandbox deployments, this is the value of package.json#name
   */
  appName: string;
  /**
   * For Amplify branch deployments, this is the Amplify app id.
   * For sandbox deployments, this defaults to $(whoami) with the option to override with `npx amplify sandbox --name value`
   */
  disambiguator: string;
  /**
   * For amplify branch deployments, this is the branch name.
   * For sandbox deployments, this is the string literal "sandbox"
   */
  branchName: string;
};
