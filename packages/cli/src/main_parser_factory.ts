import yargs, { Argv } from 'yargs';
import { createGenerateCommand } from './commands/generate/generate_command_factory.js';
import { createSandboxCommand } from './commands/sandbox/sandbox_command_factory.js';
import { createPipelineDeployCommand } from './commands/pipeline-deploy/pipeline_deploy_command_factory.js';
import packageJson from '#package.json';

/**
 * Creates main parser.
 */
export const createMainParser = (): Argv => {
  return yargs()
    .command(createGenerateCommand())
    .command(createSandboxCommand())
    .command(createPipelineDeployCommand())
    .help()
    .version(packageJson.version)
    .demandCommand()
    .strictCommands()
    .recommendCommands();
};
