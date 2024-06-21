import { execa } from 'execa';
import * as fs from 'fs/promises';
import path from 'path';

/**
 * Configures package.json and file for testing the specified project directory with the version of deployed-backend-client on npm
 */
export const setupDeployedBackendClient = async (
  projectRootDirPath: string
) => {
  await execa('npm', ['install', '@aws-amplify/deployed-backend-client'], {
    cwd: projectRootDirPath,
  });

  // copy file that sets up and gets metadata using deployed-backend-client from npm
  console.log();
  await fs.copyFile(
    path.join(
      process.cwd(),
      'packages/integration-tests/lib',
      'verify_outputs.js'
    ),
    path.join(projectRootDirPath, 'verify_outputs.js')
  );
};
