import yargs, { Argv } from 'yargs';
import { createGenerateCommand } from './commands/generate/generate_command_factory.js';
import { createSandboxCommand } from './commands/sandbox/sandbox_command_factory.js';
import { createPipelineDeployCommand } from './commands/pipeline-deploy/pipeline_deploy_command_factory.js';
import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader';
import { EOL } from 'os';
import { createConfigureCommand } from './commands/configure/configure_command_factory.js';
import { fromIni } from '@aws-sdk/credential-providers';

/**
 * Creates main parser.
 */
export const createMainParser = (): Argv => {
  return yargs()
    .command(createGenerateCommand())
    .command(createSandboxCommand())
    .command(createPipelineDeployCommand())
    .command(createConfigureCommand())
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
      // Skip checking aws credential and config files for 'amplify configure' command since it
      // is the one to set them up.
      if (argv._.length == 1 && argv._[0] == 'configure') {
        return;
      }
      const configFiles = await loadSharedConfigFiles();
      if (
        Object.keys(configFiles.configFile).length === 0 &&
        Object.keys(configFiles.credentialsFile).length === 0
      ) {
        throw new Error(
          `No AWS credentials or local profile detected.${EOL}Use 'amplify configure' to set one up.${EOL}`
        );
      }
      // Set aws profile if specified.
      if (argv.profile) {
        // check if we can load the profile first
        await fromIni({
          profile: argv.profile,
          ignoreCache: true,
        })();
        process.env.AWS_PROFILE = argv.profile;
      }
    });
};
