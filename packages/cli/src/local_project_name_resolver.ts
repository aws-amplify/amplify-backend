import { loadCwdPackageJson } from './cwd_package_json_loader.js';

export type ProjectNameResolver = {
  resolve(localPath?: string): Promise<string>;
};

/**
 * Resolves a local project name by reading the "name" field of the nearest package.json file
 */
export class LocalProjectNameResolver implements ProjectNameResolver {
  /**
   * loadNearestPackageJson is assigned to an instance member for testing.
   * resolve is bound to this so that it can be passed as a function reference
   */
  constructor(private readonly packageJsonLoader = loadCwdPackageJson) {
    this.resolve.bind(this);
  }

  /**
   * Locates and returns the "name" field of the nearest package.json file
   */
  async resolve() {
    return (await this.packageJsonLoader()).name;
  }
}
