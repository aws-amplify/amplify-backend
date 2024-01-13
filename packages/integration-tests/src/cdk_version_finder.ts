import fsp from 'fs/promises';
import { fileURLToPath } from 'url';
import semver from 'semver';

/**
 * This function finds the baseline (i.e. the lowest supported cdk version).
 *
 * The algorithm assumes that dependency check is going to assure that all
 * packages defined in this repo declare consistent version of CDK
 * and therefore is looking up CDK version from arbitrary package.
 */
export const findBaselineCdkVersion = async (): Promise<string> => {
  const deployerPackageJson = fileURLToPath(
    new URL('../../backend-deployer/package.json', import.meta.url)
  );

  const packageJson = JSON.parse(
    await fsp.readFile(deployerPackageJson, 'utf-8')
  );
  const cdkVersion = packageJson['peerDependencies']['aws-cdk'];
  const minCdkVersion = semver.minVersion(cdkVersion)?.version;
  if (!minCdkVersion) {
    throw new Error('Unable to find min CDK version');
  }

  return minCdkVersion;
};
