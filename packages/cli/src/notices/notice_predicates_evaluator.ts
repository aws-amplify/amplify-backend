import { Notice } from '@aws-amplify/cli-core';
import semver from 'semver';
import { PackageManagerController } from '@aws-amplify/plugin-types';
import { hideBin } from 'yargs/helpers';
import { NoticesRendererParams } from './notices_renderer.js';
import { noticesMetadataFileInstance } from './notices_files.js';
import { NamespaceResolver } from '../backend-identifier/local_namespace_resolver.js';

/**
 * Evaluates notice predicates.
 */
export class NoticePredicatesEvaluator {
  /**
   * Creates notice predicates evaluator.
   */
  constructor(
    private readonly packageManagerController: PackageManagerController,
    private readonly namespaceResolver: NamespaceResolver,
    private readonly noticesMetadataFile = noticesMetadataFileInstance,
    private readonly _process = process,
  ) {}

  evaluate = async (
    notice: Notice,
    opts: NoticesRendererParams,
  ): Promise<boolean> => {
    // If it's post deployment suppress notice by default. So that we show
    // only notices that are allow listed for deployment.
    let result = opts.event !== 'postDeployment';
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
        case 'frequency':
          if (
            !(await this.evaluateFrequency(
              predicate.frequency,
              opts.event,
              notice.id,
            ))
          ) {
            return false;
          }
          result = true;
          break;
        case 'validityPeriod':
          if (!this.evaluateValidityPeriod(predicate.from, predicate.to)) {
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

    return result;
  };

  private evaluateFrequency = async (
    expectedFrequency: 'command' | 'deployment' | 'once' | 'daily',
    event: NoticesRendererParams['event'],
    noticeId: string,
  ): Promise<boolean> => {
    const projectName = await this.namespaceResolver.resolve();
    const tracker = await this.noticesMetadataFile.read();
    if (expectedFrequency === 'command') {
      return event === 'postCommand' || event === 'listNoticesCommand';
    } else if (expectedFrequency === 'deployment') {
      return event === 'postDeployment' || event === 'listNoticesCommand';
    } else if (expectedFrequency === 'once') {
      return (
        tracker.printTimes.find((item) => {
          return item.noticeId === noticeId && item.projectName === projectName;
        }) === undefined
      );
    } else if (expectedFrequency === 'daily') {
      const trackerItem = tracker.printTimes.find((item) => {
        return item.noticeId === noticeId && item.projectName === projectName;
      });
      if (!trackerItem) {
        return true;
      }
      const shownAt = new Date(trackerItem.shownAt);
      const now = new Date();
      return (
        shownAt.getFullYear() !== now.getFullYear() ||
        shownAt.getMonth() !== now.getMonth() ||
        shownAt.getDate() !== now.getDate()
      );
    }
    return false;
  };

  private evaluateValidityPeriod = (
    from: number | undefined,
    to: number | undefined,
  ): boolean => {
    const now = Date.now();
    return (from ? now >= from : true) && (to ? now <= to : true);
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
