import { BackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { AppNameResolver } from './local_app_name_resolver.js';
import {
  BranchBackendIdentifier,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-core';

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
  constructor(private appNameResolver: AppNameResolver) {}
  resolve = async (
    args: BackendIdentifierParameters
  ): Promise<BackendIdentifier> => {
    if (args.stack) {
      return { stackName: args.stack };
    } else if (args.appId && args.branch) {
      const uniqueBackendIdentifier: UniqueBackendIdentifier =
        new BranchBackendIdentifier(args.appId, args.branch);
      return uniqueBackendIdentifier;
    } else if (args.branch) {
      return {
        appName: await this.appNameResolver.resolve(),
        branchName: args.branch,
      };
    }
    throw new Error(
      'Unable to resolve BackendIdentifier with provided parameters'
    );
  };
}
