import { execa } from 'execa';
import fsp from 'fs/promises';
import { fileURLToPath } from 'node:url';

const packageLockPath = fileURLToPath(
  new URL('../../../../package-lock.json', import.meta.url)
);

/**
 * Configures package.json for testing the specified project directory with the version of deployed-backend-client on npm
 */
export const setupDeployedBackendClient = async (
  projectRootDirPath: string
) => {
  await execa('npm', ['install', '@aws-amplify/deployed-backend-client'], {
    cwd: projectRootDirPath,
  });

  // Install constructs version that is matching our package lock.
  // Otherwise, the test might fail due to incompatible properties
  // when two definitions are present.
  const packageLock = JSON.parse(await fsp.readFile(packageLockPath, 'utf-8'));
  const constructsVersion =
    packageLock.packages['node_modules/constructs'].version;
  await execa('npm', ['install', `constructs@${constructsVersion}`], {
    cwd: projectRootDirPath,
  });
};
