import { fileURLToPath } from 'url';
import yargs, { Argv } from 'yargs';
import { PackageJsonReader } from '@aws-amplify/platform-core';
import { createGenerateCommand } from './commands/generate/generate_command_factory.js';
import { createSandboxCommand } from './commands/sandbox/sandbox_command_factory.js';
import { createPipelineDeployCommand } from './commands/pipeline-deploy/pipeline_deploy_command_factory.js';
import { createConfigureCommand } from './commands/configure/configure_command_factory.js';
import { generateCommandFailureHandler } from './error_handler.js';
import { createInfoCommand } from './commands/info/info_command_factory.js';

/**
 * Creates main parser.
 */
export const createMainParser = (): Argv => {
  const packageJson = new PackageJsonReader().read(
    fileURLToPath(new URL('../package.json', import.meta.url))
  );
  const parser = yargs()
    .version(packageJson.version ?? '')
    // This option is being used indirectly to configure the log level of the Printer instance.
    // refer: https://github.com/aws-amplify/amplify-backend/blob/main/packages/cli/src/printer.ts
    .options('debug', {
      type: 'boolean',
      default: false,
      description: 'Print debug logs to the console',
    })
    .strict()
    .command(createGenerateCommand())
    .command(createSandboxCommand())
    .command(createPipelineDeployCommand())
    .command(createConfigureCommand())
    .command(createInfoCommand())
    .help()
    .demandCommand()
    .strictCommands()
    .recommendCommands();
  parser.fail(generateCommandFailureHandler(parser));
  return parser;
};
