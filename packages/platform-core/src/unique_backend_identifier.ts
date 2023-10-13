import { BackendId, UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

/**
 * UniqueBackendIdentifierBase
 */
export abstract class UniqueBackendIdentifierBase
  implements UniqueBackendIdentifier
{
  /**
   * UniqueBackendIdentifierBase
   */
  constructor(
    /**
     * For Amplify branch environments, this is the Amplify app id
     * For sandbox deployments, this is a concatenation of package.json#name and the current local username
     */
    public readonly backendId: BackendId,
    /**
     * Disambiguator for the identifier
     */
    public readonly disambiguator: string
  ) {}
}

/**
 * BranchBackendIdentifier
 */
export class BranchBackendIdentifier extends UniqueBackendIdentifierBase {
  /**
   * BranchBackendIdentifier
   */
  constructor(public readonly backendId: BackendId, branchName: string) {
    super(backendId, branchName);
  }
}

/**
 * SandboxBackendIdentifier
 */
export class SandboxBackendIdentifier extends UniqueBackendIdentifierBase {
  /**
   * SandboxBackendIdentifier
   */
  constructor(public readonly backendId: BackendId) {
    /**
     * For sandbox deployments, disambiguator is the string literal "sandbox"
     */
    super(backendId, 'sandbox');
  }

  /**
   * Parses identifier instance from sandbox name
   */
  static tryParse(sandboxName: string): SandboxBackendIdentifier | undefined {
    const expectedSandboxNamePrefix = 'amplify-';
    const expectedSandboxNameSuffix = '-sandbox';
    if (
      !sandboxName.startsWith(expectedSandboxNamePrefix) ||
      !sandboxName.endsWith(expectedSandboxNameSuffix)
    ) {
      return;
    }
    const backendId = sandboxName
      .replace(expectedSandboxNamePrefix, '')
      .replace(expectedSandboxNameSuffix, '');
    return new SandboxBackendIdentifier(backendId);
  }
}
