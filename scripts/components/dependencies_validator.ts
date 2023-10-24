import fsp from 'fs/promises';
import path from 'path';
import { execa } from 'execa';

export type DependencyRule =
  | {
      denyAll: true;
      allowList?: never;
    }
  | {
      denyAll?: never;
      allowList: Array<string>;
    };

type NpmListOutputItem = {
  name?: string;
  dependencies?: Record<string, NpmListOutputItem>;
};

type DependencyViolation = {
  packageName: string;
  dependencyName: string;
};

/**
 * Validates dependencies. Inspects each path, enumerates all dependencies
 * using 'npm ls --all --json', i.e. direct and transitive, and validates them
 * against the rules.
 */
export class DependenciesValidator {
  /**
   * Creates dependency validator
   */
  constructor(
    private packagePaths: Array<string>,
    private dependencyRules: Record<string, DependencyRule>
  ) {}

  /**
   * Reads a name from package.json located at package path.
   */
  private async getPackageName(packagePath: string): Promise<string> {
    return JSON.parse(
      (await fsp.readFile(path.join(packagePath, 'package.json'))).toString()
    ).name;
  }

  /**
   * Checks dependencies of a package located at packagePath against
   * provided rules.
   */
  private async checkPackageDependencies(
    packagePath: string
  ): Promise<Array<DependencyViolation>> {
    const packageName = await this.getPackageName(packagePath);
    console.log(`Checking ${packageName} dependencies.`);
    const npmListResult = JSON.parse(
      (
        await execa('npm', ['ls', '--all', '--json'], {
          cwd: packagePath,
        })
      ).stdout.toString()
    );

    const allDependencies =
      this.collectAllDependenciesRecursively(npmListResult);

    const violations: Array<DependencyViolation> = [];
    for (const dependencyName of allDependencies) {
      if (dependencyName === packageName) {
        // skip if self referencing
        continue;
      }
      if (dependencyName in this.dependencyRules) {
        const dependencyRule: DependencyRule =
          this.dependencyRules[dependencyName];
        const isViolating =
          dependencyRule.denyAll ||
          !dependencyRule.allowList.includes(packageName);
        if (isViolating) {
          violations.push({
            packageName,
            dependencyName,
          });
        }
      }
    }
    return violations;
  }

  /**
   * Recursively scans output from npm ls to collect all dependency names.
   */
  private collectAllDependenciesRecursively(
    npmListOutput: NpmListOutputItem
  ): Set<string> {
    const dependencies: Set<string> = new Set();

    if (npmListOutput.dependencies) {
      for (const dependencyName in npmListOutput.dependencies) {
        dependencies.add(dependencyName);
        const nestedDependencies = this.collectAllDependenciesRecursively(
          npmListOutput.dependencies[dependencyName]
        );
        nestedDependencies.forEach((item) => dependencies.add(item));
      }
    }

    return dependencies;
  }

  /**
   * Validates whether all packages conform to dependency rules.
   * Throws if violation is found.
   */
  async validate() {
    const violations: Array<DependencyViolation> = (
      await Promise.all(
        this.packagePaths.map((packagePath) =>
          this.checkPackageDependencies(packagePath)
        )
      )
    ).flat();

    if (violations.length > 0) {
      const errorMessage = violations
        .map(
          (violation) =>
            `Package ${violation.packageName} must not have ${violation.dependencyName} anywhere in dependency graph`
        )
        .join('\n');
      throw new Error(errorMessage);
    }
  }
}
