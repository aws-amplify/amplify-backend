import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { ClientConfigGeneratorAdapter } from './client_config_generator_adapter.js';
import { ClientConfigWriter } from './client_config_writer.js';
import path from 'path';
import { BackendIdentifier } from '@aws-amplify/client-config';
import { ProjectNameResolver } from '../../../local_project_name_resolver.js';

export type GenerateConfigCommandOptions = {
  stack: string | undefined;
  appId: string | undefined;
  branch: string | undefined;
  out: string | undefined;
};

/**
 * Command that generates client config.
 */
export class GenerateConfigCommand
  implements CommandModule<object, GenerateConfigCommandOptions>
{
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  private readonly missingArgsError = new Error(
    'Either --stack or --branch must be provided'
  );

  /**
   * Creates client config generation command.
   */
  constructor(
    private readonly clientConfigGenerator: ClientConfigGeneratorAdapter,
    private readonly clientConfigWriter: ClientConfigWriter,
    private readonly projectNameResolver: ProjectNameResolver
  ) {
    this.command = 'config';
    this.describe = 'Generates client config';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<GenerateConfigCommandOptions>
  ): Promise<void> => {
    const backendIdentifier = await this.getBackendIdentifier(args);
    const clientConfig = await this.clientConfigGenerator.generateClientConfig(
      backendIdentifier
    );
    const targetPath = path.join(
      args.out ?? process.cwd(),
      'amplifyconfiguration.json'
    );
    await this.clientConfigWriter.writeClientConfig(clientConfig, targetPath);
  };

  /**
   * Translates args to BackendIdentifier.
   * Throws if translation can't be made (this should never happen if command validation works correctly).
   */
  private async getBackendIdentifier(
    args: ArgumentsCamelCase<GenerateConfigCommandOptions>
  ): Promise<BackendIdentifier> {
    if (args.stack) {
      return { stackName: args.stack };
    } else if (args.appId && args.branch) {
      return { appId: args.appId, branch: args.branch };
    } else if (args.branch) {
      return {
        appName: await this.projectNameResolver.resolve(),
        branch: args.branch,
      };
    } else {
      throw this.missingArgsError;
    }
  }

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<GenerateConfigCommandOptions> => {
    return yargs
      .option('stack', {
        conflicts: ['appId', 'branch'],
        describe: 'A stack name that contains an Amplify backend',
        type: 'string',
        array: false,
        group: 'Stack identifier',
      })
      .option('appId', {
        conflicts: ['stack'],
        describe: 'The Amplify App ID of the project',
        type: 'string',
        array: false,
        implies: 'branch',
        group: 'Project identifier',
      })
      .option('branch', {
        conflicts: ['stack'],
        describe: 'A git branch of the Amplify project',
        type: 'string',
        array: false,
        group: 'Project identifier',
      })
      .option('out', {
        describe:
          'A path to directory where config is written. If not provided defaults to current process working directory.',
        type: 'string',
        array: false,
      })
      .check((argv) => {
        if (!argv.stack && !argv.branch) {
          throw this.missingArgsError;
        }
        return true;
      });
  };
}
