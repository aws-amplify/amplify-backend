import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { NamespaceResolver } from './local_namespace_resolver.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';

export type BackendIdentifierParameters = {
  stack?: string;
  appId?: string;
  branch?: string;
};

export type BackendIdentifierResolver = {
  resolveDeployedBackendIdentifier: (
    args: BackendIdentifierParameters
  ) => Promise<DeployedBackendIdentifier | undefined>;
  resolveBackendIdentifier: (
    args: BackendIdentifierParameters
  ) => Promise<BackendIdentifier | undefined>;
};

/**
 * Translates args to BackendIdentifier.
 * Throws if translation can't be made (this should never happen if command validation works correctly).
 */
export class AppBackendIdentifierResolver implements BackendIdentifierResolver {
  /**
   * Instantiates BackendIdentifierResolver
   */
  constructor(private readonly namespaceResolver: NamespaceResolver) {}
  resolveDeployedBackendIdentifier = async (
    args: BackendIdentifierParameters
  ): Promise<DeployedBackendIdentifier | undefined> => {
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
    return undefined;
  };
  resolveBackendIdentifier = async (
    args: BackendIdentifierParameters
  ): Promise<BackendIdentifier | undefined> => {
    if (args.stack) {
      return BackendIdentifierConversions.fromStackName(args.stack);
    } else if (args.appId && args.branch) {
      return {
        namespace: args.appId,
        name: args.branch,
        type: 'branch',
      };
    } else if (args.branch) {
      return {
        namespace: await this.namespaceResolver.resolve(),
        name: args.branch,
        type: 'branch',
      };
    }

    return undefined;
  };
}
