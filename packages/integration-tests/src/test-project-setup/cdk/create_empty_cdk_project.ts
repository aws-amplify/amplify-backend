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
  parentDir: string
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

  return { projectName, projectRoot };
};
