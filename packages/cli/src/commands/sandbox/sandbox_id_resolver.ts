import { userInfo as _userInfo } from 'os';
import { BackendIdResolver } from '../../backend-identifier/local_backend_id_resolver.js';
import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';

/**
 * Resolves an ID that can be used to uniquely identify sandbox environments
 */
export class SandboxIdResolver {
  /**
   * Initialize with an appName resolver
   */
  constructor(
    private readonly backendIdResolver: BackendIdResolver,
    private readonly userInfo = _userInfo
  ) {}

  /**
   * Returns a concatenation of the resolved appName and the current username
   */
  resolve = async (): Promise<SandboxBackendIdentifier> => {
    const backendId = await this.backendIdResolver.resolve();
    const userName = this.userInfo().username;

    /**
     * backendId is used to construct the stack name which has a limitation of 128 characters.
     * Sandbox uses the format `amplify-sandboxId-sandbox`. To prevent breaching the CFN limit
     * and avoiding truncating username, we truncate the length of AppName (128 - 16 - length of userName - 1).
     */
    return new SandboxBackendIdentifier(
      backendId.substring(0, 112 - userName.length - 1),
      userName
    );
  };
}
