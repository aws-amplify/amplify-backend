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

  const pathsObj = {
    // The path here is coupled with backend-function's generated typedef file path
    '@env/*': ['../.amplify/function-env/*'],
  };

  const tsConfigPath = path.resolve(absoluteDirPath, 'tsconfig.json');
  const tsConfigContent = (await fs.readFile(tsConfigPath, 'utf-8')).replace(
    /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, // Removes all comments
    ''
  );
  const tsConfigObject = JSON.parse(tsConfigContent);

  // Add paths object and overwrite the tsconfig file
  tsConfigObject.compilerOptions.paths = pathsObj;
  await fs.writeFile(tsConfigPath, JSON.stringify(tsConfigObject), 'utf-8');
};
