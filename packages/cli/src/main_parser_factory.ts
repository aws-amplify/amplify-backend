import yargs, { Argv } from 'yargs';
import { createGenerateCommand } from './commands/generate/generate_command_factory.js';
import { createSandboxCommand } from './commands/sandbox/sandbox_command_factory.js';
import { createPipelineDeployCommand } from './commands/pipeline-deploy/pipeline_deploy_command_factory.js';
import { PackageJsonFileLoader } from './package_json_loader.js';
import { fileURLToPath } from 'url';

/**
 * Creates main parser.
 */
export const createMainParser = async (): Promise<Argv> => {
  return yargs()
    .command(createGenerateCommand())
    .command(createSandboxCommand())
    .command(createPipelineDeployCommand())
    .help()
    .version(
      (
        await new PackageJsonFileLoader().loadPackageJson(
          fileURLToPath(new URL('..', import.meta.url))
        )
      ).version
    )
    .demandCommand()
    .strictCommands()
    .recommendCommands();
};
