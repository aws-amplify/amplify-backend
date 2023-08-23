import { CwdPackageJsonLoader } from './cwd_package_json_loader.js';

export type AppNameResolver = {
  resolve(localPath?: string): Promise<string>;
};

/**
 * Reads the local app name from package.json#name in the current directory
 */
export class LocalAppNameResolver implements AppNameResolver {
  /**
   * packageJsonLoader is assigned to an instance member for testing.
   * resolve is bound to this so that it can be passed as a function reference
   */
  constructor(private readonly packageJsonLoader = new CwdPackageJsonLoader()) {
    this.resolve = this.resolve.bind(this);
  }

  /**
   * Returns a concatenation of package.json#name and $(whoami)
   */
  async resolve() {
    return (await this.packageJsonLoader.loadCwdPackageJson()).name;
  }
}
