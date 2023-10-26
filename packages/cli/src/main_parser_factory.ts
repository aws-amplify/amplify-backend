import yargs, { Argv } from 'yargs';
import { createGenerateCommand } from './commands/generate/generate_command_factory.js';
import { createSandboxCommand } from './commands/sandbox/sandbox_command_factory.js';
import { createPipelineDeployCommand } from './commands/pipeline-deploy/pipeline_deploy_command_factory.js';
import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader';
import { EOL } from 'os';

/**
 * Creates main parser.
 */
export const createMainParser = (): Argv => {
  return yargs()
    .command(createGenerateCommand())
    .command(createSandboxCommand())
    .command(createPipelineDeployCommand())
    .help()
    .demandCommand()
    .strictCommands()
    .recommendCommands()
    .option('profile', {
      describe: 'Use a specific AWS profile from your credential file',
      type: 'string',
      array: false,
      global: true,
    })
    .middleware(async (argv) => {
      const configFiles = await loadSharedConfigFiles();
      if (
        Object.keys(configFiles.configFile).length === 0 ||
        Object.keys(configFiles.credentialsFile).length === 0
      ) {
        throw new Error(
          `No AWS credentials or local profile detected.${EOL}Use 'npx amplify configure profile' to set one up.${EOL}`
        );
      }
      if (argv.profile) {
        process.env.AWS_PROFILE = argv.profile;
      }
    });
};
