import { CwdPackageJsonLoader } from './cwd_package_json_loader.js';
import _os from 'os';

export type ProjectNameResolver = {
  resolve(localPath?: string): Promise<string>;
};

/**
 * Generates a deterministic local appId using package.json#name and $(whoami)
 */
export class LocalAppIdResolver implements ProjectNameResolver {
  /**
   * packageJsonLoader is assigned to an instance member for testing.
   * resolve is bound to this so that it can be passed as a function reference
   */
  constructor(
    private readonly packageJsonLoader = new CwdPackageJsonLoader(),
    private readonly os = _os
  ) {
    this.resolve = this.resolve.bind(this);
  }

  /**
   * Returns a concatenation of package.json#name and $(whoami)
   */
  async resolve() {
    return `${(await this.packageJsonLoader.loadCwdPackageJson()).name}-${
      this.os.userInfo().username
    }`;
  }
}
