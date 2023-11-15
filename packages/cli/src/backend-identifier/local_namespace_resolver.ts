import { CwdPackageJsonLoader } from '@aws-amplify/platform-core';

export type NamespaceResolver = {
  resolve: () => Promise<string>;
};

/**
 * Reads the local app name from package.json#name in the current directory
 */
export class LocalNamespaceResolver implements NamespaceResolver {
  /**
   * packageJsonLoader is assigned to an instance member for testing.
   * resolve is bound to this so that it can be passed as a function reference
   */
  constructor(private readonly packageJsonLoader: CwdPackageJsonLoader) {}

  /**
   * Returns the value of package.json#name from the current working directory
   */
  resolve = async () => {
    const name = this.packageJsonLoader.read().name;
    if (name) return name;
    throw new Error('Cannot load name from the package.json');
  };
}
