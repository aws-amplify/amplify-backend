import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { ClientConfigGeneratorAdapter } from './client_config_generator_adapter.js';
import { ClientConfigWriter } from './client_config_writer.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import path from 'path';

export type GenerateConfigCommandOptions = {
  stack: string | undefined;
  project: string | undefined;
  branch: string | undefined;
  out: string | undefined;
};

/**
 * An command that generates client config.
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

  /**
   * Creates client config generation command.
   */
  constructor(
    private readonly clientConfigGenerator: ClientConfigGeneratorAdapter,
    private readonly clientConfigWriter: ClientConfigWriter
  ) {
    this.command = 'config';
    this.describe = 'Generates client config';
  }

  /**
   * @inheritDoc
   */
  async handler(
    args: ArgumentsCamelCase<GenerateConfigCommandOptions>
  ): Promise<void> {
    const backendIdentifier = this.getBackendIdentifier(args);
    const clientConfig = await this.clientConfigGenerator.generateClientConfig(
      backendIdentifier
    );
    const targetPath = path.join(
      args.out ?? process.cwd(),
      'amplifyconfiguration.json'
    );
    await this.clientConfigWriter.writeClientConfig(clientConfig, targetPath);
  }

  /**
   * Translates args to BackendIdentifier.
   * Throws if translation can't be made (this should never happen if command validation works correctly).
   */
  private getBackendIdentifier(
    args: ArgumentsCamelCase<GenerateConfigCommandOptions>
  ): BackendIdentifier {
    if (args.stack) {
      return { stackName: args.stack };
    } else if (args.project && args.branch) {
      return {
        projectName: args.project,
        environmentName: args.branch,
      };
    } else {
      throw new Error('Unable to map arguments to backend identifier');
    }
  }

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<GenerateConfigCommandOptions> => {
    return yargs
      .option('stack', {
        conflicts: ['project', 'branch'],
        type: 'string',
        array: false,
        group: 'Stack identifier',
      })
      .option('project', {
        conflicts: ['stack'],
        type: 'string',
        array: false,
        implies: 'branch',
        group: 'Project identifier',
      })
      .option('branch', {
        conflicts: ['stack'],
        type: 'string',
        array: false,
        implies: 'project',
        group: 'Project identifier',
      })
      .option('out', {
        type: 'string',
        array: false,
      })
      .check((argv) => {
        if (!argv.project && !argv.branch && !argv.stack) {
          throw new Error(
            'Either --stack or --project and --branch must be provided'
          );
        }
      });
  };
}
