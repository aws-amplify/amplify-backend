import fsp from 'fs/promises';
import { fileURLToPath } from 'node:url';
import semver from 'semver';

/**
 * This function finds the baseline (i.e. the lowest supported cdk version).
 *
 * The algorithm assumes that dependency check is going to assure that all
 * packages defined in this repo declare consistent version of CDK
 * and therefore is looking up CDK version from arbitrary package.
 */
export const findBaselineCdkVersion = async (): Promise<{
  cdkCli: string;
  cdkLib: string;
}> => {
  const deployerPackageJson = fileURLToPath(
    new URL('../../backend-deployer/package.json', import.meta.url)
  );

  const packageJson = JSON.parse(
    await fsp.readFile(deployerPackageJson, 'utf-8')
  );
  const cdkCliVersion = packageJson['peerDependencies']['aws-cdk'];
  const minCdkCliVersion = semver.minVersion(cdkCliVersion)?.version;
  if (!minCdkCliVersion) {
    throw new Error('Unable to find min CDK CLI version');
  }
  const cdkLibVersion = packageJson['peerDependencies']['aws-cdk-lib'];
  const minCdkLibVersion = semver.minVersion(cdkLibVersion)?.version;
  if (!minCdkLibVersion) {
    throw new Error('Unable to find min CDK Lib version');
  }

  return {
    cdkCli: minCdkCliVersion,
    cdkLib: minCdkLibVersion,
  };
};
