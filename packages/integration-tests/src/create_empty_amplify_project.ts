import fs from 'fs/promises';
import path from 'path';
import { shortUuid } from './short_uuid.js';

export const TEST_PROJECT_PREFIX = 'test-project';

/**
 * Creates an empty Amplify project directory within the specified parent
 * The project contains an empty `amplify` directory and a package.json file with a name
 */
export const createEmptyAmplifyProject = async (
  name: string,
  parentDir: string
): Promise<{
  projectName: string;
  projectRoot: string;
  projectAmplifyDir: string;
}> => {
  const projectRoot = await fs.mkdtemp(path.join(parentDir, name));
  const projectName = `${TEST_PROJECT_PREFIX}-${name}-${shortUuid()}`;
  await fs.writeFile(
    path.join(projectRoot, 'package.json'),
    JSON.stringify({ name: projectName }, null, 2)
  );

  const projectAmplifyDir = path.join(projectRoot, 'amplify');
  await fs.mkdir(projectAmplifyDir);

  return { projectName, projectRoot, projectAmplifyDir };
};
