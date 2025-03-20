import { Notice } from '@aws-amplify/cli-core';
import semver from 'semver';
import { PackageManagerController } from '@aws-amplify/plugin-types';
import { hideBin } from 'yargs/helpers';
import { NoticesRendererParams } from './notices_renderer.js';

/**
 * Evaluates notice predicates.
 */
export class NoticePredicatesEvaluator {
  /**
   * Creates notice predicates evaluator.
   */
  constructor(
    private readonly packageManagerController: PackageManagerController,
    private readonly _process = process,
  ) {}

  evaluate = async (
    notice: Notice,
    opts: NoticesRendererParams,
  ): Promise<boolean> => {
    for (const predicate of notice.predicates) {
      switch (predicate.type) {
        case 'nodeVersion':
          if (!this.evaluateNodeVersion(predicate.versionRange)) {
            return false;
          }
          break;
        case 'osFamily':
          if (!this.evaluateOsFamily(predicate.osFamily)) {
            return false;
          }
          break;
        case 'backendComponent':
          // TODO out of scope for now due to complexity.
          // Detecting backend components could be accomplished by:
          // 1. Inspecting outputs file. (Not ideal, file is available only after successful deployment).
          // 2. Inspecting cdk.out assembly (Does not require deployment, but relies on assembly format).
          // 3. Have synthesis leave additional file into .amplify that we can read. (We control everything).
          // 4. Have in memory ability to record information about verticals (Similar to 3 but requires integration with Toolkit to go first to spike it).
          break;
        case 'command':
          if (!this.evaluateCommand(predicate.command)) {
            return false;
          }
          break;
        case 'errorMessage':
          if (!this.evaluateErrorMessage(predicate.errorMessage, opts?.error)) {
            return false;
          }
          break;
        case 'packageVersion':
          if (
            !(await this.evaluatePackageVersion(
              predicate.packageName,
              predicate.versionRange,
            ))
          ) {
            return false;
          }
          break;
      }
    }

    return true;
  };

  private evaluateCommand = (expectedCommand: string): boolean => {
    const command = hideBin(this._process.argv)[0];
    return command === expectedCommand;
  };

  private evaluateOsFamily = (
    expectedOsFamily: 'windows' | 'macos' | 'linux',
  ): boolean => {
    switch (expectedOsFamily) {
      case 'windows':
        return this._process.platform === 'win32';
      case 'macos':
        return this._process.platform === 'darwin';
      case 'linux':
        return this._process.platform === 'linux';
    }
  };

  private evaluateErrorMessage = (
    expectedErrorMessage: string,
    actualError: Error | undefined,
  ): boolean => {
    if (!actualError) {
      return false;
    }
    return actualError.message.includes(expectedErrorMessage);
  };

  private evaluateNodeVersion = (versionRange: string): boolean => {
    return semver.satisfies(this._process.version, versionRange);
  };

  private evaluatePackageVersion = async (
    packageName: string,
    versionRange: string,
  ): Promise<boolean> => {
    const dependencies =
      await this.packageManagerController.tryGetDependencies();
    if (dependencies) {
      const matchingPackage = dependencies.find(
        (dependency) =>
          dependency.name === packageName &&
          semver.satisfies(dependency.version, versionRange),
      );
      return matchingPackage !== undefined;
    }
    return false;
  };
}
