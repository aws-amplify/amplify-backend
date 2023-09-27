/**
 * Some string type aliases to make the code a bit more self documenting
 * A BackendId can either be an AppId or a SandboxId
 * In either case, it is just a string that is used to disambiguate stack names
 */
export type AppId = string;
export type SandboxId = string;
export type BackendId = AppId | SandboxId;

/**
 * Tuple of values that uniquely identifies a deployed backend.
 * Used to generate stack names for deployments
 */
export abstract class UniqueBackendIdentifier {
  /**
   * Disambiguator for the identifier
   */
  public readonly disambiguator: string;

  /**
   * For Amplify branch environments, this is the Amplify app id
   * For sandbox deployments, this is a concatenation of package.json#name and the current local username
   */
  constructor(public readonly backendId: BackendId) {}
}

/**
 * BranchBackendIdentifier
 */
export class BranchBackendIdentifier extends UniqueBackendIdentifier {
  /**
   * BranchBackendIdentifier
   */
  constructor(
    public readonly backendId: BackendId,
    /**
     * For amplify branch deployments, this is the branch name.
     */
    public readonly disambiguator: string
  ) {
    super(backendId);
  }
}

/**
 * SandboxBackendIdentifier
 */
export class SandboxBackendIdentifier extends UniqueBackendIdentifier {
  /**
   * For sandbox deployments, this is the string literal "sandbox"
   */
  public readonly disambiguator = 'sandbox';

  /**
   * SandboxBackendIdentifier
   */
  constructor(public readonly backendId: BackendId) {
    super(backendId);
  }
}
