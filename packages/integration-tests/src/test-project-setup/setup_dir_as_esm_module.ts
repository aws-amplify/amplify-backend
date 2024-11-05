import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Configures a minimal package.json and tsconfig.json to make the specified directory compile as an ESM module
 */
export const setupDirAsEsmModule = async (absoluteDirPath: string) => {
  const packageJsonContent = { type: 'module' };
  await fs.writeFile(
    path.resolve(absoluteDirPath, 'package.json'),
    JSON.stringify(packageJsonContent, null, 2)
  );

  const tsConfigTemplate = {
    compilerOptions: {
      target: 'es2022',
      module: 'preserve',
      moduleDetection: 'force',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      // eslint-disable-next-line spellcheck/spell-checker
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      strict: true,
      skipLibCheck: true,
      // The path here is coupled with backend-function's generated typedef file path
      paths: { '$amplify/*': ['../.amplify/generated/*'] },
    },
  };
  const tsConfigPath = path.resolve(absoluteDirPath, 'tsconfig.json');
  await fs.writeFile(
    tsConfigPath,
    JSON.stringify(tsConfigTemplate, null, 2),
    'utf-8'
  );
};
