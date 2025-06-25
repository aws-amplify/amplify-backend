import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import fs from 'fs';
import fsp from 'fs/promises';
import { LogLevel, format, printer } from '@aws-amplify/cli-core';
import { isDevToolsRunning } from './port_checker.js';
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
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { EOL } from 'os';

export type SandboxCommandOptionsKebabCase = ArgumentsKebabCase<
  {
    dirToWatch: string | undefined;
    exclude: string[] | undefined;
    outputsFormat: ClientConfigFormat | undefined;
    outputsOutDir: string | undefined;
    outputsVersion: string;
    once: boolean | undefined;
    streamFunctionLogs: boolean | undefined;
    logsFilter: string[] | undefined;
    logsOutFile: string | undefined;
  } & SandboxCommandGlobalOptions
>;

export type EventHandler = (...args: unknown[]) => void;

export type SandboxEventHandlers = {
  successfulDeployment: EventHandler[];
  successfulDeletion: EventHandler[];
  failedDeployment: EventHandler[];
  resourceConfigChanged: EventHandler[];
};

export type SandboxEventHandlerParams = {
  sandboxIdentifier?: string;
  clientConfigLifecycleHandler: ClientConfigLifecycleHandler;
};

export type SandboxEventHandlerCreator = (
  params: SandboxEventHandlerParams,
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
  private profile?: string;

  /**
   * Creates sandbox command.
   */
  constructor(
    private readonly sandboxFactory: SandboxSingletonFactory,
    private readonly sandboxSubCommands: CommandModule[],
    private clientConfigGeneratorAdapter: ClientConfigGeneratorAdapter,
    private commandMiddleware: CommandMiddleware,
    private readonly sandboxEventHandlerCreator?: SandboxEventHandlerCreator,
  ) {
    this.command = 'sandbox';
    this.describe =
      'Starts sandbox, watch mode for Amplify backend deployments';
  }

  /**
   * @inheritDoc
   */

  handler = async (
    args: ArgumentsCamelCase<SandboxCommandOptionsKebabCase>,
  ): Promise<void> => {
    printer.log('DEBUG: Starting sandbox handler execution', LogLevel.DEBUG);
    const sandbox = await this.sandboxFactory.getInstance();
    printer.log('DEBUG: Sandbox instance created', LogLevel.DEBUG);
    this.sandboxIdentifier = args.identifier;
    this.profile = args.profile;
    printer.log(`DEBUG: Sandbox identifier: ${this.sandboxIdentifier}, profile: ${this.profile}`, LogLevel.DEBUG);

    // attaching event handlers
    const clientConfigLifecycleHandler = new ClientConfigLifecycleHandler(
      this.clientConfigGeneratorAdapter,
      args.outputsVersion as ClientConfigVersion,
      args.outputsOutDir,
      args.outputsFormat,
    );
    printer.log('DEBUG: Created client config lifecycle handler', LogLevel.DEBUG);
    const eventHandlers = this.sandboxEventHandlerCreator?.({
      sandboxIdentifier: this.sandboxIdentifier,
      clientConfigLifecycleHandler,
    });
    printer.log(`DEBUG: Event handlers created: ${eventHandlers ? 'yes' : 'no'}`, LogLevel.DEBUG);
    
    if (eventHandlers) {
      Object.entries(eventHandlers).forEach(([event, handlers]) => {
        printer.log(`DEBUG: Attaching ${handlers.length} handlers for event: ${event}`, LogLevel.DEBUG);
        handlers.forEach((handler) => sandbox.on(event, handler));
      });
    }
    const watchExclusions = args.exclude ?? [];
    const fileName = getClientConfigFileName(
      args.outputsVersion as ClientConfigVersion,
    );
    const clientConfigWritePath = await getClientConfigPath(
      fileName,
      args.outputsOutDir,
      args.outputsFormat,
    );

    if (!fs.existsSync(clientConfigWritePath)) {
      await generateEmptyClientConfigToFile(
        args.outputsVersion as ClientConfigVersion,
        args.outputsOutDir,
        args.outputsFormat,
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
        logsFilters: args.logsFilter,
        logsOutFile: args.logsOutFile,
      };

      if (args.logsOutFile) {
        watchExclusions.push(args.logsOutFile);
      }
    }
    printer.log('DEBUG: Starting sandbox with options:', LogLevel.DEBUG);
    printer.log(`DEBUG: - dir: ${args.dirToWatch || 'undefined'}`, LogLevel.DEBUG);
    printer.log(`DEBUG: - exclude: ${JSON.stringify(watchExclusions)}`, LogLevel.DEBUG);
    printer.log(`DEBUG: - identifier: ${args.identifier || 'undefined'}`, LogLevel.DEBUG);
    printer.log(`DEBUG: - watchForChanges: ${!args.once}`, LogLevel.DEBUG);
    printer.log(`DEBUG: - functionStreamingOptions: ${JSON.stringify(functionStreamingOptions)}`, LogLevel.DEBUG);
    
    // Check if DevTools is running (asks user to start sandbox in Devtools, so Devtools can manage the sandbox)
    const devToolsRunning = await isDevToolsRunning();
    if (devToolsRunning) {
      printer.log('DevTools is currently running', LogLevel.ERROR);
      throw new AmplifyUserError('DevToolsRunningError', {
        message: 'DevTools is currently running. Please start the sandbox through DevTools instead.',
        resolution: 'Open DevTools in your browser and use the "Start Sandbox" button to start the sandbox.',
      });
    }
    
    try {
      await sandbox.start({
        dir: args.dirToWatch,
        exclude: watchExclusions,
        identifier: args.identifier,
        watchForChanges: !args.once,
        functionStreamingOptions,
      });
      printer.log('DEBUG: Sandbox started successfully', LogLevel.DEBUG);
      
      // Register additional event listeners for debugging
      sandbox.on('successfulDeployment', () => {
        printer.log('DEBUG: Event - successfulDeployment triggered', LogLevel.DEBUG);
      });
      
      sandbox.on('failedDeployment', (error) => {
        printer.log(`DEBUG: Event - failedDeployment triggered: ${error}`, LogLevel.DEBUG);
      });
      
      sandbox.on('resourceConfigChanged', () => {
        printer.log('DEBUG: Event - resourceConfigChanged triggered', LogLevel.DEBUG);
      });
      
      sandbox.on('successfulDeletion', () => {
        printer.log('DEBUG: Event - successfulDeletion triggered', LogLevel.DEBUG);
      });
      
    } catch (error) {
      printer.log(`DEBUG: Error starting sandbox: ${error}`, LogLevel.ERROR);
      throw error;
    }
    
    process.once('SIGINT', () => {
      printer.log('DEBUG: SIGINT received, handling sandbox shutdown', LogLevel.DEBUG);
      void this.sigIntHandler();
    });
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
          conflicts: [
            'exclude',
            'dir-to-watch',
            'stream-function-logs',
            'logs-filter',
            'logs-out-file',
          ],
        })
        .option('stream-function-logs', {
          describe:
            'Whether to stream function execution logs. Default: false. Use --logs-filter in addition to this flag to stream specific function logs',
          boolean: true,
          global: false,
          group: 'Logs streaming',
        })
        .option('logs-filter', {
          describe: `Regex pattern to filter logs from only matched functions. E.g. to stream logs for a function, specify it's name, and to stream logs from all functions starting with auth specify 'auth' Default: Stream all logs`,
          array: true,
          global: false,
          type: 'string',
          group: 'Logs streaming',
          implies: ['stream-function-logs'],
          requiresArg: true,
        })
        .option('logs-out-file', {
          describe:
            'File to append the streaming logs. The file is created if it does not exist. Default: stdout',
          array: false,
          global: false,
          type: 'string',
          group: 'Logs streaming',
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
              throw new AmplifyUserError('InvalidCommandInputError', {
                message: `Invalid --identifier provided: ${argv.identifier}`,
                resolution:
                  'Use an identifier that matches [a-zA-Z0-9-] and is less than 15 characters.',
              });
            }
          }
          return true;
        })
        .middleware([this.commandMiddleware.ensureAwsCredentialAndRegion])
    );
  };

  sigIntHandler = async () => {
    printer.log('DEBUG: sigIntHandler called - stopping sandbox process', LogLevel.DEBUG);
    try {
      const sandbox = await this.sandboxFactory.getInstance();
      printer.log('DEBUG: Attempting to stop sandbox', LogLevel.DEBUG);
      await sandbox.stop();
    } catch (error) {
      printer.log(`DEBUG: Error in sigIntHandler: ${error}`, LogLevel.ERROR);
    }
    
    printer.print(
      `${EOL}Stopping the sandbox process. To delete the sandbox, run ${format.normalizeAmpxCommand(
        'sandbox delete',
      )}`,
    );
  };

  private validateDirectory = async (option: string, dir: string) => {
    let stats;
    try {
      stats = await fsp.stat(dir, {});
    } catch (e) {
      throw new Error(`--${option} ${dir} does not exist`, { cause: e });
    }
    if (!stats.isDirectory()) {
      throw new Error(`--${option} ${dir} is not a valid directory`);
    }
  };
}
