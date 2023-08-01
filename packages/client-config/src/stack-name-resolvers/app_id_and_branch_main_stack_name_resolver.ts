import { MainStackNameResolver } from '@aws-amplify/plugin-types';
import { AmplifyClient, GetAppCommand } from '@aws-sdk/client-amplify';
import { getMainStackName } from '../get_main_stack_name.js';

/**
 * Tuple of Amplify AppID and branch name
 */
export type AppIdAndBranchBackendIdentifier = {
  appId: string;
  branch: string;
};

/**
 * Resolves stack names based on an Amplify AppID
 */
export class AppIdAndBranchMainStackNameResolver
  implements MainStackNameResolver
{
  /**
   * Initialize with an amplify client and app identifiers
   */
  constructor(
    private readonly amplifyClient: AmplifyClient,
    private readonly appIdAndBranch: AppIdAndBranchBackendIdentifier
  ) {}

  /**
   * Queries Amplify service for the appName corresponding to the provided appId, then constructs the full stack name
   */
  async resolveMainStackName(): Promise<string> {
    const getAppResult = await this.amplifyClient.send(
      new GetAppCommand({ appId: this.appIdAndBranch.appId })
    );
    if (typeof getAppResult?.app?.name !== 'string') {
      throw new Error('Could not determine app name from provided app ID');
    }
    return getMainStackName({
      appName: getAppResult.app.name,
      branchName: this.appIdAndBranch.branch,
      disambiguator: this.appIdAndBranch.appId,
    });
  }
}
