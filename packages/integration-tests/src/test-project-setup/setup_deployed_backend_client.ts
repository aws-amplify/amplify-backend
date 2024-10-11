import { execa } from 'execa';
import fsp from 'fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'path';

const packageLockPath = fileURLToPath(
  new URL('../../../../package-lock.json', import.meta.url)
);

/**
 * Configures package.json for testing the specified project directory with the version of deployed-backend-client on npm
 */
export const setupDeployedBackendClient = async (
  projectRootDirPath: string
) => {
  // copy lock file to assure that CDK dependencies don't diverge.
  await fsp.copyFile(
    packageLockPath,
    path.join(projectRootDirPath, 'package-lock.json')
  );
  await execa(
    'npm',
    ['install', '@aws-amplify/deployed-backend-client@latest'],
    {
      cwd: projectRootDirPath,
    }
  );
};
