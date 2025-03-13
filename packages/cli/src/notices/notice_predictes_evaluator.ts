import { Notice } from '@aws-amplify/cli-core';
import semver from 'semver';
import { PackageManagerController } from '@aws-amplify/plugin-types';

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

  evaluate = async (predicates: Notice['predicates']): Promise<boolean> => {
    for (const predicate of predicates) {
      switch (predicate.type) {
        case 'nodeVersion':
          if (!this.evaluateNodeVersion(predicate.versionRange)) {
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
        case 'osFamily':
          // TODO
          break;
        case 'backendComponent':
          // TODO
          break;
        case 'command':
          // TODO
          break;
        case 'errorMessage':
          // TODO
          break;
        case 'frequency':
          // TODO
          break;
        case 'validityPeriod':
          // TODO
          break;
      }
    }

    return true;
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
      return (
        dependencies.find((dependency) => {
          dependency.name === packageName &&
            semver.satisfies(dependency.version, versionRange);
        }) !== undefined
      );
    }
    return false;
  };
}
