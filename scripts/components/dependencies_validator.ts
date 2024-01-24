import { execa as _execa } from 'execa';
import { EOL } from 'os';
import { readPackageJson } from './package-json/package_json.js';

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
 * Validates dependencies.
 *
 * Inspects each path, enumerates all dependencies
 * using 'npm ls --all --json', i.e. direct and transitive, and validates them
 * against the rules.
 *
 * Inspects dependency version declarations in package json files
 * in order to assert consistency.
 */
export class DependenciesValidator {
  /**
   * Creates dependency validator
   * @param packagePaths paths of packages to validate
   * @param dependencyRules dependency exclusion and inclusion rules
   * @param linkedDependencies dependencies that should be versioned with the same version
   * @param execa in order to inject execa mock in tests
   */
  constructor(
    private packagePaths: Array<string>,
    private dependencyRules: Record<string, DependencyRule>,
    private linkedDependencies: Array<Array<string>>,
    private execa = _execa
  ) {}

  /**
   * Validates dependencies.
   * Throws if violation is found.
   */
  async validate() {
    await this.validateDependencyDenyAndAllowListRules();
    await this.validateDependencyVersionsConsistency();
  }

  /**
   * Validates that all packages declare dependency using consistent version.
   */
  private async validateDependencyVersionsConsistency(): Promise<void> {
    console.log('Checking dependency versions consistency');
    const packageJsons = await Promise.all(
      this.packagePaths.map((packagePath) => readPackageJson(packagePath))
    );

    type DependencyVersionsUsage = {
      allVersions: Set<string>;
      allDeclarations: Array<{
        packageName: string;
        version: string;
      }>;
    };

    const dependencyVersionsUsages: Record<string, DependencyVersionsUsage> =
      {};
    for (const packageJson of packageJsons) {
      [
        packageJson.dependencies,
        packageJson.devDependencies,
        packageJson.peerDependencies,
      ].forEach((dependencies) => {
        if (dependencies) {
          for (const dependencyName of Object.keys(dependencies)) {
            const dependencyVersion = dependencies[dependencyName];
            let dependencyVersionsUsage =
              dependencyVersionsUsages[dependencyName];
            if (!dependencyVersionsUsage) {
              dependencyVersionsUsage = {
                allVersions: new Set(),
                allDeclarations: [],
              };
              dependencyVersionsUsages[dependencyName] =
                dependencyVersionsUsage;
            }
            dependencyVersionsUsage.allVersions.add(dependencyVersion);
            dependencyVersionsUsage.allDeclarations.push({
              packageName: packageJson.name,
              version: dependencyVersion,
            });
          }
        }
      });
    }

    const errors: Array<string> = [];
    for (const dependencyName of Object.keys(dependencyVersionsUsages)) {
      const dependencyVersionUsage = dependencyVersionsUsages[dependencyName];
      if (dependencyVersionUsage.allVersions.size > 1) {
        errors.push(
          `Dependency ${dependencyName} is declared using inconsistent versions ${JSON.stringify(
            dependencyVersionUsage.allDeclarations
          )}`
        );
      }
    }
    for (const linkedDependencySpec of this.linkedDependencies) {
      const allLinkedVersions: Set<string> = new Set();
      for (const dependencyName of linkedDependencySpec) {
        const dependencyVersionUsage = dependencyVersionsUsages[dependencyName];
        dependencyVersionUsage.allVersions.forEach((version) =>
          allLinkedVersions.add(version)
        );
      }

      if (allLinkedVersions.size > 1) {
        errors.push(
          `Dependencies ${linkedDependencySpec.join(
            ','
          )} should be declared using same version, versions found ${Array.from(
            allLinkedVersions
          ).join(',')}`
        );
      }
    }
    if (errors.length > 0) {
      throw new Error(errors.join(EOL));
    }
  }

  /**
   * Validates whether all packages conform to dependency deny and allow list rules.
   * Throws if violation is found.
   */
  private async validateDependencyDenyAndAllowListRules(): Promise<void> {
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

  /**
   * Checks dependencies of a package located at packagePath against
   * provided rules.
   */
  private async checkPackageDependencies(
    packagePath: string
  ): Promise<Array<DependencyViolation>> {
    const packageName = (await readPackageJson(packagePath)).name;
    console.log(`Checking ${packageName} dependencies.`);
    const npmListResult = JSON.parse(
      // We're using 'npm ls' to reveal dependencies because it reveals
      // all dependencies including optional dependencies.
      // Alternatives like 'npm explain' do not reveal optional dependencies
      // if they are not present in the graph.
      (
        await this.execa('npm', ['ls', '--all', '--json'], {
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
}
