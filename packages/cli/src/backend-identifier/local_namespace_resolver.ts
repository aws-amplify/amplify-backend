import {
  AmplifyUserError,
  PackageJsonReader,
} from '@aws-amplify/platform-core';
import { EOL } from 'os';

export type NamespaceResolver = {
  resolve: () => Promise<string>;
};

/**
 * Reads the local app name from package.json#name in the current directory
 */
export class LocalNamespaceResolver implements NamespaceResolver {
  /**
   * packageJsonReader is assigned to an instance member for testing.
   * resolve is bound to this so that it can be passed as a function reference
   */
  constructor(private readonly packageJsonReader: PackageJsonReader) {}

  /**
   * Returns the value of package.json#name from the current working directory
   */
  resolve = async () => {
    const name = this.packageJsonReader.readFromCwd().name;
    if (name) return name;
    throw new AmplifyUserError('InvalidPackageJsonError', {
      message: 'Cannot load name from the package.json',
      resolution: `Ensure you are running ampx commands in root of your project (i.e. in the parent of the 'amplify' directory).${EOL}Also ensure that your root package.json file has a "name" field.`,
    });
  };
}
