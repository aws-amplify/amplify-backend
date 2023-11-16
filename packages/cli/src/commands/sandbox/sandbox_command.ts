import { Argv, CommandModule } from 'yargs';
import fsp from 'fs/promises';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import { SandboxSingletonFactory } from '@aws-amplify/sandbox';
import {
  ClientConfigFormat,
  getClientConfigPath,
} from '@aws-amplify/client-config';
import { ArgumentsKebabCase } from '../../kebab_case.js';
import { handleCommandFailure } from '../../command_failure_handler.js';
import { ClientConfigLifecycleHandler } from '../../client-config/client_config_lifecycle_handler.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { CommandMiddleware } from '../../command_middleware.js';

export type SandboxCommandOptions =
  ArgumentsKebabCase<SandboxCommandOptionsCamelCase>;

type SandboxCommandOptionsCamelCase = {
  dirToWatch: string | undefined;
  exclude: string[] | undefined;
  name: string | undefined;
  configFormat: ClientConfigFormat | undefined;
  configOutDir: string | undefined;
  profile: string | undefined;
};

export type EventHandler = (...args: unknown[]) => void;

export type SandboxEventHandlers = {
  successfulDeployment: EventHandler[];
  successfulDeletion: EventHandler[];
  failedDeployment: EventHandler[];
};

export type SandboxEventHandlerParams = {
  sandboxName?: string;
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

  private sandboxName?: string;

  /**
   * Creates sandbox command.
   */
  constructor(
    private readonly sandboxFactory: SandboxSingletonFactory,
    private readonly sandboxSubCommands: CommandModule[],
    private clientConfigGeneratorAdapter: ClientConfigGeneratorAdapter,
    private commandMiddleware: CommandMiddleware,
    private readonly sandboxEventHandlerCreator?: SandboxEventHandlerCreator
  ) {
    this.command = 'sandbox';
    this.describe = 'Starts sandbox, watch mode for amplify deployments';
  }

  /**
   * @inheritDoc
   */
  handler = async (args: SandboxCommandOptions): Promise<void> => {
    const sandbox = await this.sandboxFactory.getInstance();
    this.sandboxName = args.name;

    // attaching event handlers
    const clientConfigLifecycleHandler = new ClientConfigLifecycleHandler(
      this.clientConfigGeneratorAdapter,
      args['config-out-dir'],
      args['config-format']
    );
    const eventHandlers = this.sandboxEventHandlerCreator?.({
      sandboxName: this.sandboxName,
      clientConfigLifecycleHandler,
    });
    if (eventHandlers) {
      Object.entries(eventHandlers).forEach(([event, handlers]) => {
        handlers.forEach((handler) => sandbox.on(event, handler));
      });
    }
    const watchExclusions = args.exclude ?? [];
    const clientConfigWritePath = await getClientConfigPath(
      args['config-out-dir'],
      args['config-format']
    );
    watchExclusions.push(clientConfigWritePath);
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
          global: false,
        })
        .option('exclude', {
          describe:
            'An array of paths or glob patterns to ignore. Paths can be relative or absolute and can either be files or directories',
          type: 'string',
          array: true,
          global: false,
        })
        .option('name', {
          describe:
            'An optional name to distinguish between different sandbox environments. Default is the name in your package.json',
          type: 'string',
          array: false,
          global: false,
        })
        .option('config-format', {
          describe: 'Client config output format',
          type: 'string',
          array: false,
          choices: Object.values(ClientConfigFormat),
          global: false,
        })
        .option('config-out-dir', {
          describe:
            'A path to directory where config is written. If not provided defaults to current process working directory.',
          type: 'string',
          array: false,
          global: false,
        })
        .option('profile', {
          describe: 'An AWS profile name.',
          type: 'string',
          array: false,
        })
        .check(async (argv) => {
          if (argv['dir-to-watch']) {
            await this.validateDirectory('dir-to-watch', argv['dir-to-watch']);
          }
          if (argv['config-out-dir']) {
            await this.validateDirectory(
              'config-out-dir',
              argv['config-out-dir']
            );
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
        .middleware([this.commandMiddleware.ensureAwsCredentialAndRegion])
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
      ).delete({ name: this.sandboxName });
  };

  private validateDirectory = async (option: string, dir: string) => {
    let stats;
    try {
      stats = await fsp.stat(dir, {});
    } catch (e) {
      throw new Error(`--${option} ${dir} does not exist`);
    }
    if (!stats.isDirectory()) {
      throw new Error(`--${option} ${dir} is not a valid directory`);
    }
  };
}
