import { userInfo as _userInfo } from 'os';
import { AppNameResolver } from '../../backend-identifier/local_app_name_resolver.js';

/**
 * Resolves an ID that can be used to uniquely identify sandbox environments
 */
export class SandboxIdResolver {
  /**
   * Initialize with an appName resolver
   */
  constructor(
    private readonly appNameResolver: AppNameResolver,
    private readonly userInfo = _userInfo
  ) {}

  /**
   * Returns a concatenation of the resolved appName and the current username
   */
  resolve = async (): Promise<string> => {
    const appName = await this.appNameResolver.resolve();
    const userName = this.userInfo().username;

    /**
     * Sandbox Id is used to construct the stack name which has a limitation of 128 characters.
     * Sandbox uses the format `amplify-sandboxId-sandbox`. To prevent breaching the CFN limit
     * and avoiding truncating username, we truncate the length of AppName (128 - 16 - length of userName - 1).
     */
    return `${appName.substring(0, 112 - userName.length - 1)}-${userName}`;
  };
}
