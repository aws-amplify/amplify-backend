import { Argv, CommandModule } from 'yargs';
import fs from 'fs';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import {
  ClientConfigFormat,
  getClientConfigPath,
} from '@aws-amplify/client-config';
import {
  DEFAULT_GRAPHQL_PATH,
  DEFAULT_UI_PATH,
} from '../../form-generation/default_form_generation_output_paths.js';
import { ArgumentsKebabCase } from '../../kebab_case.js';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { handleCommandFailure } from '../../command_failure_handler.js';
import { ClientConfigLifecycleHandler } from '../../client-config/client_config_lifecycle_handler.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';

export type SandboxCommandOptions =
  ArgumentsKebabCase<SandboxCommandOptionsCamelCase>;

type SandboxCommandOptionsCamelCase = {
  dirToWatch: string | undefined;
  exclude: string[] | undefined;
  name: string | undefined;
  format: ClientConfigFormat | undefined;
  outDir: string | undefined;
  profile: string | undefined;
  modelsOutDir: string;
  uiOutDir: string;
  modelsFilter?: string[];
};

export type EventHandler = () => void;

export type SandboxEventHandlers = {
  successfulDeployment: EventHandler[];
  successfulDeletion: EventHandler[];
};

export type SandboxEventHandlerParams = {
  appName?: string;
  clientConfigLifecycleHandler: ClientConfigLifecycleHandler;
};

export type SandboxEventHandlerCreator = (
  params: SandboxEventHandlerParams
) => SandboxEventHandlers;

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
    private readonly sandboxSubCommands: CommandModule[],
    private clientConfigGeneratorAdapter: ClientConfigGeneratorAdapter,
    private readonly sandboxEventHandlerCreator?: SandboxEventHandlerCreator,
    private readonly profileCredentialProvider = fromIni
  ) {
    this.command = 'sandbox';
    this.describe = 'Starts sandbox, watch mode for amplify deployments';
  }

  /**
   * @inheritDoc
   */
  handler = async (args: SandboxCommandOptions): Promise<void> => {
    const { profile } = args;
    if (profile) {
      // check if we can load the profile first
      await this.profileCredentialProvider({ profile })();
      process.env.AWS_PROFILE = profile;
    }
    const sandbox = await this.sandboxFactory.getInstance();
    this.appName = args.name;

    // attaching event handlers
    const clientConfigLifecycleHandler = new ClientConfigLifecycleHandler(
      this.clientConfigGeneratorAdapter
    );
    const eventHandlers = this.sandboxEventHandlerCreator?.({
      appName: args.name,
      clientConfigLifecycleHandler,
    });
    if (eventHandlers) {
      Object.entries(eventHandlers).forEach(([event, handlers]) => {
        handlers.forEach((handler) => sandbox.on(event, handler));
      });
    }
    const watchExclusions = args.exclude ?? [];
    const clientConfigWritePath = await getClientConfigPath(
      args['out-dir'],
      args.format
    );
    watchExclusions.push(
      clientConfigWritePath,
      args['ui-out-dir'],
      args['models-out-dir']
    );
    await sandbox.start({
      dir: args['dir-to-watch'],
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
        .command(this.sandboxSubCommands)
        .option('dir-to-watch', {
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
        .option('out-dir', {
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
        .option('models-out-dir', {
          describe: 'A path to directory where generated models are written.',
          default: DEFAULT_GRAPHQL_PATH,
          type: 'string',
          array: false,
          group: 'Form Generation',
        })
        .option('ui-out-dir', {
          describe: 'A path to directory where generated forms are written.',
          default: DEFAULT_UI_PATH,
          type: 'string',
          array: false,
          group: 'Form Generation',
        })
        .option('models', {
          describe: 'Model name to generate',
          type: 'string',
          array: true,
          group: 'Form Generation',
        })
        .check((argv) => {
          if (argv['dir-to-watch']) {
            // make sure it's a real directory
            let stats;
            try {
              stats = fs.statSync(argv['dir-to-watch'], {});
            } catch (e) {
              throw new Error(
                `--dir-to-watch ${argv['dir-to-watch']} does not exist`
              );
            }
            if (!stats.isDirectory()) {
              throw new Error(
                `--dir-to-watch ${argv['dir-to-watch']} is not a valid directory`
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
        .fail((msg, err) => {
          handleCommandFailure(msg, err, yargs);
          yargs.exit(1, err);
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
