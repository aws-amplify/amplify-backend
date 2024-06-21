import fs from 'fs/promises';
import path from 'path';
import { shortUuid } from '../short_uuid.js';
import { setupDirAsEsmModule } from './setup_dir_as_esm_module.js';
import { setupDeployedBackendClient } from './setup_deployed_backend_client.js';

const TEST_PROJECT_PREFIX = 'test-project';

/**
 * Creates an empty Amplify project directory within the specified parent
 * The project contains empty `amplify` and `.amplify` directories, a package.json file with a name, and a script to verify backend client outputs
 */
export const createEmptyAmplifyProject = async (
  projectDirName: string,
  parentDir: string
): Promise<{
  projectName: string;
  projectRoot: string;
  projectAmplifyDir: string;
  projectDotAmplifyDir: string;
}> => {
  const projectRoot = await fs.mkdtemp(path.join(parentDir, projectDirName));
  const projectName = `${TEST_PROJECT_PREFIX}-${projectDirName}-${shortUuid()}`;
  await fs.writeFile(
    path.join(projectRoot, 'package.json'),
    JSON.stringify({ name: projectName }, null, 2)
  );

  const projectAmplifyDir = path.join(projectRoot, 'amplify');
  await fs.mkdir(projectAmplifyDir);

  const projectDotAmplifyDir = path.join(projectRoot, '.amplify');
  await fs.mkdir(projectDotAmplifyDir);

  await setupDirAsEsmModule(projectAmplifyDir);

  await setupDeployedBackendClient(projectRoot);

  return { projectName, projectRoot, projectAmplifyDir, projectDotAmplifyDir };
};
