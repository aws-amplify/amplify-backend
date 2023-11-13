import { MainStackNameResolver } from '@aws-amplify/plugin-types';
import { AmplifyClient, ListAppsCommand } from '@aws-sdk/client-amplify';
import { BackendIdentifierConversions } from '@aws-amplify/platform-core';

/**
 * Tuple of Amplify App name and branch
 */
export type AppNameAndBranchBackendIdentifier = {
  appName: string;
  branchName: string;
};

/**
 * Resolves stack names given an Amplify app name and branch
 */
export class AppNameAndBranchMainStackNameResolver
  implements MainStackNameResolver
{
  /**
   * Initialize with an Amplify client and app info
   */
  constructor(
    private readonly amplifyClient: AmplifyClient,
    private readonly appNameAndBranch: AppNameAndBranchBackendIdentifier
  ) {}

  /**
   * Lists all apps and filters by the specified appName. If one and only one app matches, then the appId is used.
   * If zero or multiple apps are found, an error message is thrown
   */
  resolveMainStackName = async (): Promise<string> => {
    const listAppsResult = await this.amplifyClient.send(
      // 100 is the max page size. It is also the hard limit for how many Amplify apps you can have so no pagination is necessary
      new ListAppsCommand({ maxResults: 100 })
    );
    const appMatches = (listAppsResult?.apps || []).filter(
      (app) => app.name === this.appNameAndBranch.appName
    );
    const region = await this.amplifyClient.config.region();
    if (appMatches.length === 0) {
      throw new Error(
        `No apps found with name ${this.appNameAndBranch.appName} in region ${region}`
      );
    } else if (appMatches.length >= 2) {
      throw new Error(
        `Multiple apps found with name ${this.appNameAndBranch.appName} in region ${region}. Use AppId instead of AppName to specify which Amplify App to use.`
      );
    }
    // if we get here, appMatches has one and only one entry
    const appId = appMatches[0].appId;
    if (typeof appId !== 'string') {
      // if this happens something has gone seriously wrong. It's probably an Amplify service issue.
      throw new Error(
        `Could not determine appId from app name ${this.appNameAndBranch.appName}. Try using AppId instead.`
      );
    }
    return BackendIdentifierConversions.toStackName({
      namespace: appId,
      name: this.appNameAndBranch.branchName,
      type: 'branch',
    });
  };
}
