import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { NamespaceResolver } from './local_namespace_resolver.js';

type BackendIdentifierParameters = {
  stack?: string;
  appId?: string;
  branch?: string;
};
/**
 * Translates args to BackendIdentifier.
 * Throws if translation can't be made (this should never happen if command validation works correctly).
 */
export class BackendIdentifierResolver {
  /**
   * Instantiates BackendIdentifierResolver
   */
  constructor(private readonly namespaceResolver: NamespaceResolver) {}
  resolve = async (
    args: BackendIdentifierParameters
  ): Promise<DeployedBackendIdentifier> => {
    if (args.stack) {
      return { stackName: args.stack };
    } else if (args.appId && args.branch) {
      return {
        namespace: args.appId,
        name: args.branch,
        type: 'branch',
      };
    } else if (args.branch) {
      return {
        appName: await this.namespaceResolver.resolve(),
        branchName: args.branch,
      };
    }
    throw new Error(
      'Unable to resolve BackendIdentifier with provided parameters'
    );
  };
}
