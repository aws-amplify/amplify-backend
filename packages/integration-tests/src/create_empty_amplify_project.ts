import fs from 'fs/promises';
import path from 'path';
import { shortUuid } from './short_uuid.js';

/**
 * Creates an empty Amplify project directory within the specified parent
 * The project contains an empty `amplify` directory and a package.json file with a name
 */
export const createEmptyAmplifyProject = async (
  namePrefix: string,
  parentDir: string
): Promise<{ testProjectRoot: string; testAmplifyDir: string }> => {
  const testProjectRoot = await fs.mkdtemp(path.join(parentDir, namePrefix));
  await fs.writeFile(
    path.join(testProjectRoot, 'package.json'),
    JSON.stringify(
      { name: `${namePrefix}-${shortUuid()}`, type: 'module' },
      null,
      2
    )
  );

  const testAmplifyDir = path.join(testProjectRoot, 'amplify');
  await fs.mkdir(testAmplifyDir);

  return { testProjectRoot, testAmplifyDir };
};
