import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { NamespaceResolver } from './local_namespace_resolver.js';
import { BackendIdentifier, DeploymentType } from '@aws-amplify/plugin-types';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';

export type BackendIdentifierParameters = {
  stack?: string;
  appId?: string;
  branch?: string;
};

export type BackendIdentifierResolver = {
  resolve: (
    args: BackendIdentifierParameters
  ) => Promise<DeployedBackendIdentifier | undefined>;
  resolveDeployedBackendIdToBackendId: (
    deployedBackendId?: DeployedBackendIdentifier
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
  resolve = async (
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
  resolveDeployedBackendIdToBackendId = async (
    deployedBackendId?: DeployedBackendIdentifier
  ): Promise<BackendIdentifier | undefined> => {
    if (!deployedBackendId) {
      return undefined;
    }

    if ('stackName' in deployedBackendId) {
      return BackendIdentifierConversions.fromStackName(
        deployedBackendId.stackName
      );
    } else if ('appName' in deployedBackendId) {
      return {
        namespace: deployedBackendId.appName,
        name: deployedBackendId.branchName,
        type: 'branch' as DeploymentType,
      };
    }

    return deployedBackendId;
  };
}
