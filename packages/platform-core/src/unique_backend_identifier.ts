import { BackendId, UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

/**
 * UniqueBackendIdentifierBase
 */
abstract class UniqueBackendIdentifierBase implements UniqueBackendIdentifier {
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
export class BranchBackendIdentifier extends UniqueBackendIdentifierBase {
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
export class SandboxBackendIdentifier extends UniqueBackendIdentifierBase {
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
