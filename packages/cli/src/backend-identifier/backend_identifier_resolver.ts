import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { NamespaceResolver } from './local_namespace_resolver.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  AmplifyUserError,
  BackendIdentifierConversions,
} from '@aws-amplify/platform-core';

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
    try {
      if (args.stack) {
        return { stackName: args.stack };
      } else if (args.appId && args.branch) {
        return {
          namespace: args.appId,
          name: args.branch,
          type: 'branch',
        };
      } else if (args.branch) {
        const resolvedNamespace = await this.namespaceResolver.resolve();
        return {
          appName: resolvedNamespace,
          branchName: args.branch,
        };
      }
      return undefined;
    } catch (error) {
      const appNotFoundMatch = (error as Error).message.match(
        /No apps found with name (?<appName>.*) in region (?<region>.*)/
      );

      if (appNotFoundMatch?.groups) {
        const { appName, region } = appNotFoundMatch.groups;
        throw new AmplifyUserError('AmplifyAppNotFoundError', {
          message: `No Amplify app found with name "${appName}" in region "${region}".`,
          resolution: `Ensure that an Amplify app named "${appName}" exists in the "${region}" region.`,
        });
      }

      // Re-throw any other errors
      throw error;
    }
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
