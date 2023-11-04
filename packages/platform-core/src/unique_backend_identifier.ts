import { BackendId, UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

const amplifyPrefix = 'amplify';

/**
 * UniqueBackendIdentifierBase
 */
export abstract class UniqueBackendIdentifierBase
  implements UniqueBackendIdentifier
{
  /**
   * UniqueBackendIdentifierBase
   */
  protected constructor(
    /**
     * A string that identifies the backend grouping
     * (currently either appId or package.json#name, but consult the concrete implementors of this class for the source of truth)
     */
    public readonly backendId: BackendId,
    /**
     * Value to disambiguate a backend within the same grouping defined by backendId
     * (currently either branch name or current username, but consult the concrete implementors of this class for the source of truth)
     */
    public readonly disambiguator: string
  ) {}

  abstract toStackName: () => string;
}

/**
 * BranchBackendIdentifier
 */
export class BranchBackendIdentifier extends UniqueBackendIdentifierBase {
  private readonly branchSuffix = 'branch';
  /**
   * BranchBackendIdentifier
   */
  constructor(public readonly backendId: BackendId, branchName: string) {
    super(backendId, branchName);
  }

  toStackName = () =>
    `${amplifyPrefix}-${this.backendId}-${this.disambiguator}-${this.branchSuffix}`;
}

/**
 * SandboxBackendIdentifier
 */
export class SandboxBackendIdentifier extends UniqueBackendIdentifierBase {
  private static readonly sandboxSuffix = 'sandbox';

  /**
   * Construct a SandboxBackendIdentifier
   * @param backendId The value of package.json#name in the package where the sandbox deployment is being executed
   * @param disambiguator The username that the node process is executing with
   */
  constructor(
    public readonly backendId: BackendId,
    public readonly disambiguator: string
  ) {
    super(backendId, disambiguator);
  }

  toStackName = () =>
    `${amplifyPrefix}-${this.backendId}-${this.disambiguator}-${SandboxBackendIdentifier.sandboxSuffix}`;

  /**
   * Parses identifier instance from sandbox name
   */
  static tryParse(sandboxName: string): SandboxBackendIdentifier | undefined {
    const parts = sandboxName.split('-');
    if (parts.length < 4) {
      return;
    }
    if (
      parts.at(0) !== amplifyPrefix ||
      parts.at(-1) !== SandboxBackendIdentifier.sandboxSuffix
    ) {
      return;
    }
    // the parts excluding the amplify prefix and sandbox suffix
    const remainingParts = parts.slice(1, -1);

    // the backendId is everything except the last part
    const backendId = remainingParts.slice(0, -1).join('-');

    // the disambiguator is the last part
    // non-null assertion is safe because parts length was validated at the top of the function
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const disambiguator = remainingParts.at(-1)!;
    return new SandboxBackendIdentifier(backendId, disambiguator);
  }
}
