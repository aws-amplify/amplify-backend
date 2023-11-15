import fs from 'fs';
import * as path from 'path';
import yargs, { Argv } from 'yargs';
import { createGenerateCommand } from './commands/generate/generate_command_factory.js';
import { createSandboxCommand } from './commands/sandbox/sandbox_command_factory.js';
import { createPipelineDeployCommand } from './commands/pipeline-deploy/pipeline_deploy_command_factory.js';
import { createConfigureCommand } from './commands/configure/configure_command_factory.js';

/**
 * Creates main parser.
 */
export const createMainParser = (): Argv => {
  const absolutePath = './node_modules/@aws-amplify/backend-cli';
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(absolutePath, './package.json'), 'utf8')
  );
  return yargs()
    .version(packageJson.version)
    .command(createGenerateCommand())
    .command(createSandboxCommand())
    .command(createPipelineDeployCommand())
    .command(createConfigureCommand())
    .help()
    .demandCommand()
    .strictCommands()
    .recommendCommands();
};
