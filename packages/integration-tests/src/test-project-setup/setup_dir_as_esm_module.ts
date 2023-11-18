import * as path from 'path';
import * as fs from 'fs/promises';
import { execa } from 'execa';

/**
 * Configures a minimal package.json and tsconfig.json to make the specified directory compile as an ESM module
 */
export const setupDirAsEsmModule = async (absoluteDirPath: string) => {
  const packageJsonContent = { type: 'module' };
  await fs.writeFile(
    path.resolve(absoluteDirPath, 'package.json'),
    JSON.stringify(packageJsonContent, null, 2)
  );

  const tscArgs = [
    'tsc',
    '--init',
    '--resolveJsonModule',
    'true',
    '--module',
    'node16',
    '--moduleResolution',
    'node16',
    '--target',
    'es2022',
  ];

  await execa('npx', tscArgs, {
    stdio: 'inherit',
    cwd: absoluteDirPath,
  });
};
