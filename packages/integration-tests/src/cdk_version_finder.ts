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
  cdkLib: string;
}> => {
  const platformCorePackageJsonPath = fileURLToPath(
    new URL('../../platform-core/package.json', import.meta.url),
  );

  const platformCorePackageJson = JSON.parse(
    await fsp.readFile(platformCorePackageJsonPath, 'utf-8'),
  );
  const cdkLibVersion =
    platformCorePackageJson['peerDependencies']['aws-cdk-lib'];
  const minCdkLibVersion = semver.minVersion(cdkLibVersion)?.version;
  if (!minCdkLibVersion) {
    throw new Error('Unable to find min CDK Lib version');
  }

  return {
    cdkLib: minCdkLibVersion,
  };
};
