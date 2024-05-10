import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import fs from 'fs';
import fsp from 'fs/promises';
import { AmplifyPrompter } from '@aws-amplify/cli-core';
import {
  SandboxFunctionStreamingOptions,
  SandboxSingletonFactory,
} from '@aws-amplify/sandbox';
import {
  ClientConfigFormat,
  ClientConfigVersion,
  ClientConfigVersionOption,
  DEFAULT_CLIENT_CONFIG_VERSION,
  generateEmptyClientConfigToFile,
  getClientConfigFileName,
  getClientConfigPath,
} from '@aws-amplify/client-config';
import { ClientConfigLifecycleHandler } from '../../client-config/client_config_lifecycle_handler.js';
import { ClientConfigGeneratorAdapter } from '../../client-config/client_config_generator_adapter.js';
import { CommandMiddleware } from '../../command_middleware.js';
import { SandboxCommandGlobalOptions } from './option_types.js';
import { ArgumentsKebabCase } from '../../kebab_case.js';

export type SandboxCommandOptionsKebabCase = ArgumentsKebabCase<
  {
    dirToWatch: string | undefined;
    exclude: string[] | undefined;
    outputsFormat: ClientConfigFormat | undefined;
    outputsOutDir: string | undefined;
    outputsVersion: string;
    once: boolean | undefined;
    streamFunctionLogs: boolean | undefined;
    functionName: string[] | undefined;
    streamOutput: string | undefined;
  } & SandboxCommandGlobalOptions
>;

export type EventHandler = (...args: unknown[]) => void;

export type SandboxEventHandlers = {
  successfulDeployment: EventHandler[];
  successfulDeletion: EventHandler[];
  failedDeployment: EventHandler[];
};

export type SandboxEventHandlerParams = {
  sandboxIdentifier?: string;
  clientConfigLifecycleHandler: ClientConfigLifecycleHandler;
};

export type SandboxEventHandlerCreator = (
  params: SandboxEventHandlerParams
) => SandboxEventHandlers;

/**
 * Command that starts sandbox.
 */
export class SandboxCommand
  implements CommandModule<object, SandboxCommandOptionsKebabCase>
{
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  private sandboxIdentifier?: string;

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
    this.describe =
      'Starts sandbox, watch mode for Amplify backend deployments';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<SandboxCommandOptionsKebabCase>
  ): Promise<void> => {
    const sandbox = await this.sandboxFactory.getInstance();
    this.sandboxIdentifier = args.identifier;

    // attaching event handlers
    const clientConfigLifecycleHandler = new ClientConfigLifecycleHandler(
      this.clientConfigGeneratorAdapter,
      args.outputsVersion as ClientConfigVersion,
      args.outputsOutDir,
      args.outputsFormat
    );
    const eventHandlers = this.sandboxEventHandlerCreator?.({
      sandboxIdentifier: this.sandboxIdentifier,
      clientConfigLifecycleHandler,
    });
    if (eventHandlers) {
      Object.entries(eventHandlers).forEach(([event, handlers]) => {
        handlers.forEach((handler) => sandbox.on(event, handler));
      });
    }
    const watchExclusions = args.exclude ?? [];
    const fileName = getClientConfigFileName(
      args.outputsVersion as ClientConfigVersion
    );
    const clientConfigWritePath = await getClientConfigPath(
      fileName,
      args.outputsOutDir,
      args.outputsFormat
    );

    if (!fs.existsSync(clientConfigWritePath)) {
      await generateEmptyClientConfigToFile(
        args.outputsVersion as ClientConfigVersion,
        args.outputsOutDir,
        args.outputsFormat
      );
    }

    watchExclusions.push(clientConfigWritePath);

    let functionStreamingOptions: SandboxFunctionStreamingOptions = {
      enabled: false,
    };
    if (args.streamFunctionLogs) {
      // turn on function logs streaming
      functionStreamingOptions = {
        enabled: true,
        functionNames: args.functionName,
        streamOutputLocation: args.streamOutput,
      };

      if (args.streamOutput) {
        watchExclusions.push(args.streamOutput);
      }
    }
    await sandbox.start({
      dir: args.dirToWatch,
      exclude: watchExclusions,
      identifier: args.identifier,
      profile: args.profile,
      watchForChanges: !args.once,
      functionStreamingOptions,
    });
    process.once('SIGINT', () => void this.sigIntHandler());
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<SandboxCommandOptionsKebabCase> => {
    return (
      yargs
        // Cast to erase options types used in internal sub command implementation. Otherwise, compiler fails here.
        .command(this.sandboxSubCommands)
        .version(false)
        .option('dir-to-watch', {
          describe:
            'Directory to watch for file changes. All subdirectories and files will be included. Defaults to the amplify directory.',
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
        .option('identifier', {
          describe:
            'An optional identifier to distinguish between different sandboxes. Default is the name of the system user executing the process',
          type: 'string',
          array: false,
        })
        .option('outputs-format', {
          describe: 'amplify_outputs file format',
          type: 'string',
          array: false,
          choices: Object.values(ClientConfigFormat),
          global: false,
        })
        .option('outputs-version', {
          describe:
            'Version of the configuration. Version 0 represents classic amplify-cli config file amplify-configuration and 1 represents newer config file amplify_outputs',
          type: 'string',
          array: false,
          choices: Object.values(ClientConfigVersionOption),
          global: false,
          default: DEFAULT_CLIENT_CONFIG_VERSION,
        })
        .option('outputs-out-dir', {
          describe:
            'A path to directory where amplify_outputs is written. If not provided defaults to current process working directory.',
          type: 'string',
          array: false,
          global: false,
        })
        .option('profile', {
          describe: 'An AWS profile name.',
          type: 'string',
          array: false,
        })
        .option('once', {
          describe:
            'Execute a single sandbox deployment without watching for future file changes',
          boolean: true,
          global: false,
        })
        .option('stream-function-logs', {
          describe:
            'Whether to stream function execution logs. Default: false. Use --function-names to filter for specific functions to stream logs from',
          boolean: true,
          global: false,
          group: 'Options to configure streaming of lambda function logs',
        })
        .option('function-name', {
          describe:
            'Name of functions to stream execution logs from. Usage --function-name func1 --function-name func2. Default: Stream all functions logs',
          array: true,
          type: 'string',
          group: 'Options to configure streaming of lambda function logs',
          implies: ['stream-function-logs'],
          requiresArg: true,
        })
        .option('stream-output', {
          describe:
            'File to append the function execution logs. The file is created if it does not exist. Default: stdout',
          array: false,
          type: 'string',
          group: 'Options to configure streaming of lambda function logs',
          implies: ['stream-function-logs'],
          requiresArg: true,
        })
        .check(async (argv) => {
          if (argv['dir-to-watch']) {
            await this.validateDirectory('dir-to-watch', argv['dir-to-watch']);
          }
          if (argv.identifier) {
            const identifierRegex = /^[a-zA-Z0-9-]{1,15}$/;
            if (!argv.identifier.match(identifierRegex)) {
              throw new Error(
                `--identifier should match [a-zA-Z0-9-] and be less than 15 characters.`
              );
            }
          }
          return true;
        })
        .conflicts('once', [
          'exclude',
          'dir-to-watch',
          'stream-function-logs',
          'function-name',
          'stream-output',
        ])
        .middleware([this.commandMiddleware.ensureAwsCredentialAndRegion])
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
      ).delete({ identifier: this.sandboxIdentifier });
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
