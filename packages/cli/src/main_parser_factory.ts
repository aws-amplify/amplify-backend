import yargs, { Argv } from 'yargs';
import { UsageDataEmitter } from '@aws-amplify/platform-core';
import { createGenerateCommand } from './commands/generate/generate_command_factory.js';
import { createSandboxCommand } from './commands/sandbox/sandbox_command_factory.js';
import { createPipelineDeployCommand } from './commands/pipeline-deploy/pipeline_deploy_command_factory.js';
import { createConfigureCommand } from './commands/configure/configure_command_factory.js';
import { generateCommandFailureHandler } from './error_handler.js';
import { createInfoCommand } from './commands/info/info_command_factory.js';
import * as path from 'path';

/**
 * Creates main parser.
 */
export const createMainParser = (
  libraryVersion: string,
  usageDataEmitter?: UsageDataEmitter
): Argv => {
  const parser = yargs()
    .version(libraryVersion)
    // This option is being used indirectly to configure the log level of the Printer instance.
    // refer: https://github.com/aws-amplify/amplify-backend/blob/main/packages/cli/src/printer.ts
    .options('debug', {
      type: 'boolean',
      default: false,
      description: 'Print debug logs to the console',
    })
    .strict()
    // pnpm places the command bin file in `ampx.js` instead of `ampx` which causes yargs to think the command name is `ampx.js`.
    // This tells yargs that the command name is `ampx`.
    .scriptName(path.parse(process.argv[1]).name)
    .command(createGenerateCommand())
    .command(createSandboxCommand())
    .command(createPipelineDeployCommand())
    .command(createConfigureCommand())
    .command(createInfoCommand())
    .help()
    .demandCommand()
    .strictCommands()
    .recommendCommands();

  parser.fail(generateCommandFailureHandler(parser, usageDataEmitter));

  return parser;
};
