import { CwdPackageJsonLoader } from '@aws-amplify/platform-core';

export type AppNameResolver = {
  resolve: () => Promise<string>;
};

/**
 * Reads the local app name from package.json#name in the current directory
 */
export class LocalAppNameResolver implements AppNameResolver {
  /**
   * packageJsonLoader is assigned to an instance member for testing.
   * resolve is bound to this so that it can be passed as a function reference
   */
  constructor(private readonly packageJsonLoader: CwdPackageJsonLoader) {}

  /**
   * Returns the value of package.json#name from the current working directory
   */
  resolve = async () => {
    const packageJsonName = (await this.packageJsonLoader.loadCwdPackageJson())
      .name;

    // App Names are used in generating stack names where some special symbols are not allowed
    return packageJsonName.replace(/[.,@ ]/g, '').replace(/[_/]/g, '-');
  };
}
