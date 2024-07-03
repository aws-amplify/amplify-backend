import { execa } from 'execa';

/**
 * Configures package.json for testing the specified project directory with the version of deployed-backend-client on npm
 */
export const setupDeployedBackendClient = async (
  projectRootDirPath: string
) => {
  await execa('npm', ['install', '@aws-amplify/deployed-backend-client'], {
    cwd: projectRootDirPath,
  });
};
