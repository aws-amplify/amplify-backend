import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { SandboxDeleteCommand } from './sandbox-delete/sandbox_delete_command.js';
import fs from 'fs';
import { AmplifyPrompter } from '../prompter/amplify_prompts.js';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import { SandboxIdResolver } from './sandbox_id_resolver.js';
import { LocalAppNameResolver } from '../../local_app_name_resolver.js';
import { CwdPackageJsonLoader } from '../../cwd_package_json_loader.js';
import {
  ClientConfigFormat,
  getClientConfigPath,
} from '@aws-amplify/client-config';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';

export type SandboxCommandOptions = {
  dirToWatch: string | undefined;
  exclude: string[] | undefined;
  name: string | undefined;
  format: ClientConfigFormat | undefined;
  out: string | undefined;
  profile: string | undefined;
};

/**
 * Command that starts sandbox.
 */
export class SandboxCommand
  implements CommandModule<object, SandboxCommandOptions>
{
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  private appName?: string;

  /**
   * Creates sandbox command.
   */
  constructor(
    private readonly sandboxFactory: SandboxSingletonFactory,
    private readonly sandboxDeleteCommand: SandboxDeleteCommand,
    private readonly clientConfigGenerator: ClientConfigGeneratorAdapter
  ) {
    this.command = 'sandbox';
    this.describe = 'Starts sandbox, watch mode for amplify deployments';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SandboxCommandOptions>
  ): Promise<void> => {
    this.appName = args.name;
    const sandbox = await this.sandboxFactory.getInstance();
    const sandboxIdResolver = new SandboxIdResolver(
      new LocalAppNameResolver(new CwdPackageJsonLoader())
    );
    const sandboxId = args.name ?? (await sandboxIdResolver.resolve());
    const backendIdentifier = {
      backendId: sandboxId,
      branchName: 'sandbox',
    };
    sandbox.on('onSuccessfulDeployment', () => {
      this.clientConfigGenerator.generateClientConfigToFile(
        backendIdentifier,
        args.out,
        args.format
      );
    });
    const watchExclusions = args.exclude ?? [];
    const clientConfigWritePath = await getClientConfigPath(
      args.out,
      args.format
    );
    watchExclusions.push(clientConfigWritePath);
    await sandbox.start({
      dir: args.dirToWatch,
      exclude: watchExclusions,
      name: args.name,
      profile: args.profile,
    });
    process.once('SIGINT', () => void this.sigIntHandler());
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SandboxCommandOptions> => {
    return (
      yargs
        // Cast to erase options types used in internal sub command implementation. Otherwise, compiler fails here.
        .command(this.sandboxDeleteCommand as unknown as CommandModule)
        .option('dirToWatch', {
          describe:
            'Directory to watch for file changes. All subdirectories and files will be included. defaults to the current directory.',
          type: 'string',
          array: false,
        })
        .option('exclude', {
          describe:
            'An array of paths or glob patterns to ignore. Paths can be relative or absolute and can either be files or directories',
          type: 'string',
          array: true,
        })
        .option('name', {
          describe:
            'An optional name to distinguish between different sandbox environments. Default is the name in your package.json',
          type: 'string',
          array: false,
        })
        .option('format', {
          describe: 'Client config output format',
          type: 'string',
          array: false,
          choices: Object.values(ClientConfigFormat),
        })
        .option('out', {
          describe:
            'A path to directory where config is written. If not provided defaults to current process working directory.',
          type: 'string',
          array: false,
        })
        .option('profile', {
          describe: 'An AWS profile name to use for deployment.',
          type: 'string',
          array: false,
        })
        .check((argv) => {
          if (argv.dirToWatch) {
            // make sure it's a real directory
            let stats;
            try {
              stats = fs.statSync(argv.dirToWatch, {});
            } catch (e) {
              throw new Error(`--dirToWatch ${argv.dirToWatch} does not exist`);
            }
            if (!stats.isDirectory()) {
              throw new Error(
                `--dirToWatch ${argv.dirToWatch} is not a valid directory`
              );
            }
          }
          if (argv.name) {
            const projectNameRegex = /^[a-zA-Z0-9-]{1,15}$/;
            if (!argv.name.match(projectNameRegex)) {
              throw new Error(
                `--name should match [a-zA-Z0-9-] and less than 15 characters.`
              );
            }
          }
          return true;
        })
    );
  };

  sigIntHandler = async () => {
    const answer = await AmplifyPrompter.yesOrNo({
      message:
        'Would you like to delete all the resources in your sandbox environment (This cannot be undone)?',
      defaultValue: false,
    });
    if (answer)
      await (
        await this.sandboxFactory.getInstance()
      ).delete({ name: this.appName });
  };
}
