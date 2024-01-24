import { glob } from 'glob';
import {
  readPackageJson,
  writePackageJson,
} from './components/package-json/package_json.js';
import semver from 'semver';

/**
 * This script sets baseline dependency versions in packages in the workspace for allow listed packages.
 * Baseline versions are defined as minimum version that matches dependency version declaration.
 *
 * This script updates content of 'package.json' files. These changes are needed for testing
 * and shouldn't be committed to the repo.
 */

const targetDependencyNames = new Set(['aws-cdk', 'aws-cdk-lib']);

const setBaselineDependencyVersions = async (
  packagePath: string
): Promise<void> => {
  const packageJson = await readPackageJson(packagePath);
  const dependencyManifests: Array<Record<string, string>> = [];
  if (packageJson.dependencies) {
    dependencyManifests.push(packageJson.dependencies);
  }
  if (packageJson.devDependencies) {
    dependencyManifests.push(packageJson.devDependencies);
  }
  if (packageJson.peerDependencies) {
    dependencyManifests.push(packageJson.peerDependencies);
  }

  for (const dependencyManifest of dependencyManifests) {
    for (const dependencyName of Object.keys(dependencyManifest)) {
      if (targetDependencyNames.has(dependencyName)) {
        const version = dependencyManifest[dependencyName];
        const baselineVersion = semver.minVersion(version)?.version;
        if (!baselineVersion) {
          throw new Error(`Unable to find min version for ${version}`);
        }
        dependencyManifest[dependencyName] = baselineVersion;
      }
    }
  }

  await writePackageJson(packagePath, packageJson);
};

const packagePaths = await glob('packages/*');
for (const packagePath of packagePaths) {
  await setBaselineDependencyVersions(packagePath);
}
