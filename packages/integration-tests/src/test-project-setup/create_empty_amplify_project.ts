import fs from 'fs/promises';
import path from 'path';
import { shortUuid } from '../short_uuid.js';
import { setupDirAsEsmModule } from './setup_dir_as_esm_module.js';

const TEST_PROJECT_PREFIX = 'test-project';

/**
 * Creates an empty Amplify project directory within the specified parent
 * The project contains empty `amplify` and `.amplify` directories and a package.json file
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
    JSON.stringify({ name: projectName, type: 'module' }, null, 2)
  );

  const projectAmplifyDir = path.join(projectRoot, 'amplify');
  await fs.mkdir(projectAmplifyDir);

  const projectDotAmplifyDir = path.join(projectRoot, '.amplify');
  await fs.mkdir(projectDotAmplifyDir);

  await setupDirAsEsmModule(projectAmplifyDir);

  return { projectName, projectRoot, projectAmplifyDir, projectDotAmplifyDir };
};
