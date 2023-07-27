import { MainStackNameResolver } from '@aws-amplify/plugin-types';
import { AmplifyClient, ListAppsCommand } from '@aws-sdk/client-amplify';
import { getMainStackName } from '../get_main_stack_name.js';

/**
 * Tuple of Amplify App name and branch
 */
export type AppNameAndBranch = {
  appName: string;
  branch: string;
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
    private readonly appNameAndBranch: AppNameAndBranch
  ) {}

  /**
   * Lists all apps and filters by the specified appName. If one and only one app matches, then the appId is used.
   * If zero or multiple apps are found, an error message is thrown
   */
  async resolveMainStackName(): Promise<string> {
    const listAppsResult = await this.amplifyClient.send(
      new ListAppsCommand({ maxResults: 100 })
    );
    const appMatches = (listAppsResult?.apps || []).filter(
      (app) => app.name === this.appNameAndBranch.appName
    );
    if (appMatches.length === 0) {
      throw new Error(
        `No apps found with name ${this.appNameAndBranch.appName}`
      );
    } else if (appMatches.length >= 2) {
      throw new Error(
        `Multiple apps found with name ${this.appNameAndBranch.appName}. Use AppId instead of AppName to specify which Amplify App to use.`
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
    return getMainStackName({
      appName: this.appNameAndBranch.appName,
      disambiguator: appId,
      branchName: this.appNameAndBranch.branch,
    });
  }
}
