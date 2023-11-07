/**
 * Some string type aliases to make the code a bit more self documenting
 * A BackendId can either be an AppId or a SandboxId.
 * A SandboxId is the value of package.json#name in the project's package.json file
 */
export type AppId = string;
export type SandboxId = string;
export type BackendId = AppId | SandboxId;

/**
 * The disambiguator is either a branch name in the case of branch deployments or the sandbox name for sandbox deployments
 * By default the sandbox name is the username of the current local user
 */
export type Disambiguator = BranchName | SandboxName;
export type BranchName = string;
export type SandboxName = string;

/**
 * Tuple of values that uniquely identifies a deployed backend.
 * Used to generate stack names for deployments
 */
export type UniqueBackendIdentifier = {
  /**
   * For Amplify branch environments, this is the Amplify app id
   * For sandbox deployments, this is package.json#name
   */
  backendId: Readonly<BackendId>;
  /**
   * For amplify branch deployments, this is the branch name.
   * For sandbox deployments, this is the string literal "sandbox"
   */
  disambiguator: Readonly<Disambiguator>;
  /**
   * Convert the backend identifier to the corresponding stack name
   */
  toStackName: () => string;
};

/**
 * Only the data fields from UniqueBackendIdentifier
 */
export type UniqueBackendIdentifierData = Pick<
  UniqueBackendIdentifier,
  'backendId' | 'disambiguator'
>;
