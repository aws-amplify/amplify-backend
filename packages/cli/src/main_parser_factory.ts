import { fileURLToPath } from 'url';
import yargs, { Argv } from 'yargs';
import { PackageJsonReader } from '@aws-amplify/platform-core';
import { createGenerateCommand } from './commands/generate/generate_command_factory.js';
import { createSandboxCommand } from './commands/sandbox/sandbox_command_factory.js';
import { createPipelineDeployCommand } from './commands/pipeline-deploy/pipeline_deploy_command_factory.js';
import { createConfigureCommand } from './commands/configure/configure_command_factory.js';

/**
 * Creates main parser.
 */
export const createMainParser = (): Argv => {
  const packageJson = new PackageJsonReader().read(
    fileURLToPath(new URL('../package.json', import.meta.url))
  );
  return yargs()
    .version(packageJson.version ?? '')
    .command(createGenerateCommand())
    .command(createSandboxCommand())
    .command(createPipelineDeployCommand())
    .command(createConfigureCommand())
    .help()
    .demandCommand()
    .strictCommands()
    .recommendCommands();
};
