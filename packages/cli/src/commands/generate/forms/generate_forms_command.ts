import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import path from 'path';
import { BackendIdentifier } from '@aws-amplify/client-config';
import { ClientConfigGeneratorAdapter } from '../config/client_config_generator_adapter.js';
import { LocalFormGenerator } from './local_form_generator.js';
import { AppNameResolver } from '../../../local_app_name_resolver.js';

export type GenerateFormsCommandOptions = {
  stack: string | undefined;
  appId: string | undefined;
  branch: string | undefined;
  out: string | undefined;
};

/**
 * Command that generates client config.
 */
export class GenerateFormsCommand
  implements CommandModule<object, GenerateFormsCommandOptions>
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
    'Either --stack or --branch must be provided',
  );

  /**
   * Creates client config generation command.
   */
  constructor(
    private readonly clientConfigGenerator: ClientConfigGeneratorAdapter,
    private readonly appNameResolver: AppNameResolver,
  ) {
    this.command = 'forms';
    this.describe = 'Generates UI forms';
  }

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<GenerateFormsCommandOptions>,
  ): Promise<void> => {
    const backendIdentifier = await this.getBackendIdentifier(args);
    const baseDirectory = args.out ?? process.cwd();
    const modelgenDirectory = path.join(baseDirectory, 'src/graphql/');
    const formgenDirectory = path.join(baseDirectory, 'src/ui-components/');
    const config =
      await this.clientConfigGenerator.generateClientConfig(backendIdentifier);
    console.log('#######HOLA#######', JSON.stringify(config, null, 2));
    if (!config.aws_appsync_graphqlEndpoint) {
      throw new TypeError('appsync endpoint is null');
    }
    const apiId = config.aws_appsync_apiId;
    console.log(apiId);
    if (!apiId) {
      throw new TypeError('AppSync apiId must be defined');
    }

    const localFormGenerator = new LocalFormGenerator({ apiId });
    await localFormGenerator.generateForms();
  };

  /**
   * Translates args to BackendIdentifier.
   * Throws if translation can't be made (this should never happen if command validation works correctly).
   */
  private async getBackendIdentifier(
    args: ArgumentsCamelCase<GenerateFormsCommandOptions>,
  ): Promise<BackendIdentifier> {
    if (args.stack) {
      return { stackName: args.stack };
    } else if (args.appId && args.branch) {
      return { backendId: args.appId, branchName: args.branch };
    } else if (args.branch) {
      return {
        appName: await this.appNameResolver.resolve(),
        branchName: args.branchName as string,
      };
    } else {
      throw this.missingArgsError;
    }
  }

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<GenerateFormsCommandOptions> => {
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
