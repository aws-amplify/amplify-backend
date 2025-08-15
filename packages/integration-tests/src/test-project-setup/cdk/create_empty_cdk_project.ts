import fsp from 'fs/promises';
import path from 'path';
import { cdkCli } from '../../process-controller/process_controller.js';
import { existsSync } from 'fs';

const TEST_PROJECT_PREFIX = 'test-cdk-project';

/**
 * Creates an empty CDK project directory within the specified parent.
 */
export const createEmptyCdkProject = async (
  projectTemplateName: string,
  parentDir: string,
): Promise<{
  projectName: string;
  projectRoot: string;
}> => {
  const projectName = `${TEST_PROJECT_PREFIX}-${projectTemplateName}`;
  const projectRoot = path.join(parentDir, projectName);
  if (existsSync(projectRoot)) {
    await fsp.rm(projectRoot, { recursive: true, force: true });
  }
  await fsp.mkdir(projectRoot);

  await cdkCli(['init', 'app', '--language', 'typescript'], projectRoot).run();

  // Remove local node_modules after CDK init.
  // This is to make sure that test project is using same version of
  // CDK and constructs as the rest of the codebase.
  // Otherwise, we might get errors about incompatible classes if
  // dependencies on npm are ahead of our package-lock.
  await fsp.rm(path.join(projectRoot, 'node_modules'), {
    recursive: true,
    force: true,
  });

  // Update tsconfig.json to include types for "node:" imports
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  const tsconfig = JSON.parse(await fsp.readFile(tsconfigPath, 'utf-8'));
  if (!tsconfig.compilerOptions.types) {
    tsconfig.compilerOptions.types = [];
  }
  if (!tsconfig.compilerOptions.types.includes('node')) {
    tsconfig.compilerOptions.types.push('node');
  }
  await fsp.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));

  return { projectName, projectRoot };
};
