import { execa as _execa } from 'execa';
import { EOL } from 'os';
import { PackageJson, readPackageJson } from './package-json/package_json.js';

export type DependencyRule =
  | {
      denyAll: true;
      allowList?: never;
    }
  | {
      denyAll?: never;
      allowList: Array<string>;
    };

export type DependencyWithKnownException = {
  dependencyName: string;
  globalDependencyVersion: string;
  exceptions: Array<{ packageName: string; dependencyVersion: string }>;
};

type NpmListOutputItem = {
  name?: string;
  dependencies?: Record<string, NpmListOutputItem>;
};

type DependencyViolation = {
  packageName: string;
  dependencyName: string;
};

type DependencyDeclaration = {
  dependentPackageName: string;
  version: string;
};

type DependencyVersionPredicate = (
  declarations: DependencyDeclaration[]
) => true | string;

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
  private repoPackageJsons: PackageJson[] | undefined = undefined;
  private repoPackageNames: string[] | undefined = undefined;
  /**
   * Creates dependency validator
   * @param packagePaths paths of packages to validate
   * @param disallowedDependencies dependency exclusion and inclusion rules
   * @param linkedDependencies dependencies that should be versioned with the same version
   * @param knownInconsistentDependencies dependencies that are known to violate the consistency check
   * @param execa in order to inject execa mock in tests
   */
  constructor(
    private packagePaths: Array<string>,
    private disallowedDependencies: Record<string, DependencyRule>,
    private linkedDependencies: Array<Array<string>>,
    private knownInconsistentDependencies: Array<DependencyWithKnownException>,
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
    const packageJsons = await this.getRepoPackageJsons();

    type DependencyVersionsUsage = {
      allDeclarations: DependencyDeclaration[];
    };

    const dependencyVersionsUsages: Record<string, DependencyVersionsUsage> =
      {};
    for (const packageJson of packageJsons) {
      [
        packageJson.dependencies,
        packageJson.devDependencies,
        packageJson.peerDependencies,
      ].forEach((dependency) => {
        if (dependency) {
          for (const dependencyName of Object.keys(dependency)) {
            const dependencyVersion = dependency[dependencyName];
            let dependencyVersionsUsage =
              dependencyVersionsUsages[dependencyName];
            if (!dependencyVersionsUsage) {
              dependencyVersionsUsage = {
                allDeclarations: [],
              };
              dependencyVersionsUsages[dependencyName] =
                dependencyVersionsUsage;
            }
            dependencyVersionsUsage.allDeclarations.push({
              dependentPackageName: packageJson.name,
              version: dependencyVersion,
            });
          }
        }
      });
    }

    const errors: Array<string> = [];
    for (const [dependencyName, dependencyVersionUsage] of Object.entries(
      dependencyVersionsUsages
    )) {
      const validationResult = (
        await this.getPackageVersionDeclarationPredicate(dependencyName)
      )(dependencyVersionUsage.allDeclarations);
      if (typeof validationResult === 'string') {
        errors.push(
          `${validationResult}${EOL}${JSON.stringify(
            dependencyVersionUsage.allDeclarations,
            null,
            2
          )}`
        );
      }
    }
    for (const linkedDependencySpec of this.linkedDependencies) {
      const allLinkedVersions: Set<string> = new Set();
      for (const dependencyName of linkedDependencySpec) {
        const dependencyVersionUsage = dependencyVersionsUsages[dependencyName];
        dependencyVersionUsage.allDeclarations.forEach(({ version }) =>
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
      if (dependencyName in this.disallowedDependencies) {
        const dependencyRule: DependencyRule =
          this.disallowedDependencies[dependencyName];
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

  private getPackageVersionDeclarationPredicate = async (
    packageName: string
  ): Promise<DependencyVersionPredicate> => {
    if (
      this.knownInconsistentDependencies.find(
        (a) => a.dependencyName === packageName
      ) !== undefined
    ) {
      // @aws-amplify/plugin-types can depend on execa@^5.1.1 as a workaround for https://github.com/aws-amplify/amplify-backend/issues/962
      // all other packages must depend on execa@^8.0.1
      // this can be removed once execa is patched
      const inconsistentDependency = this.knownInconsistentDependencies.find(
        (x) => x.dependencyName === packageName
      );
      return (declarations) => {
        const validationResult = declarations.every(
          ({ dependentPackageName, version }) =>
            inconsistentDependency!.exceptions.find(
              (a) => a.packageName === dependentPackageName
            )?.dependencyVersion ||
            version === inconsistentDependency!.globalDependencyVersion
        );
        return (
          validationResult ||
          `${packageName} dependency declarations must depend on version ${
            inconsistentDependency!.globalDependencyVersion
          } except in the following packages` +
            inconsistentDependency!.exceptions.forEach(
              (exception) =>
                `, ${exception.packageName} where it must depend on ${exception.dependencyVersion}`
            )
        );
      };
    } else if ((await this.getRepoPackageNames()).includes(packageName)) {
      // repo packages only need consistent major versions
      return (declarations) => {
        if (declarations.length === 0) {
          return true;
        }
        const baselineMajorVersion = declarations
          .at(0)!
          .version.split('.')
          .at(0)!;
        const validationResult = declarations.every(({ version }) =>
          version.startsWith(baselineMajorVersion)
        );
        return (
          validationResult ||
          `${packageName} dependency declarations must all be on the same major version`
        );
      };
    }
    // default behavior for all other packages is that they must be on the same version
    return (declarations) => {
      const versionSet = new Set(declarations.map(({ version }) => version));
      return (
        versionSet.size === 1 ||
        `${packageName} dependency declarations must all the on the same semver range`
      );
    };
  };

  private getRepoPackageJsons = async () => {
    if (!this.repoPackageJsons) {
      this.repoPackageJsons = await Promise.all(
        this.packagePaths.map((packagePath) => readPackageJson(packagePath))
      );
    }
    return this.repoPackageJsons;
  };

  private getRepoPackageNames = async () => {
    if (!this.repoPackageNames) {
      this.repoPackageNames = (await this.getRepoPackageJsons()).map(
        (packageJson) => packageJson.name
      );
    }
    return this.repoPackageNames;
  };
}
