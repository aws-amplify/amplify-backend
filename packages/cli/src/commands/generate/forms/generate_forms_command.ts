import path from 'path';
import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { BackendIdentifier } from '@aws-amplify/client-config';
import { ClientConfigGeneratorAdapter } from '../config/client_config_generator_adapter.js';
import { createFormGenerator } from '@aws-amplify/form-generator';
import { createGraphqlDocumentGenerator } from '@aws-amplify/model-generator';
import { AppNameResolver } from '../../../local_app_name_resolver.js';

export type GenerateFormsCommandOptions = {
  stack: string | undefined;
  appId: string | undefined;
  branch: string | undefined;
  uiOut: string | undefined;
  modelsOut: string | undefined;
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
    'Either --stack or --branch must be provided'
  );

  /**
   * Creates client config generation command.
   */
  constructor(
    private readonly clientConfigGenerator: ClientConfigGeneratorAdapter,
    private readonly appNameResolver: AppNameResolver
  ) {
    this.command = 'forms';
    this.describe = 'Generates UI forms';
  }
  private getAppDescription = (
    backendIdentifier: BackendIdentifier
  ): { appId: string; environmentName: string } => {
    if ('stackName' in backendIdentifier) {
      return {
        appId: backendIdentifier.stackName,
        environmentName: 'sandbox',
      };
    } else if ('backendId' in backendIdentifier) {
      return {
        appId: backendIdentifier.backendId,
        environmentName: backendIdentifier.branchName,
      };
    }
    return {
      appId: backendIdentifier.appName,
      environmentName: backendIdentifier.branchName,
    };
  };

  /**
   * @inheritDoc
   */
  handler = async (
    args: ArgumentsCamelCase<GenerateFormsCommandOptions>
  ): Promise<void> => {
    const backendIdentifier = await this.getBackendIdentifier(args);
    const config = await this.clientConfigGenerator.generateClientConfig(
      backendIdentifier
    );
    if (!config.aws_appsync_graphqlEndpoint) {
      throw new TypeError('appsync endpoint is null');
    }
    const apiId = config.aws_appsync_apiId;
    if (!apiId) {
      throw new TypeError('AppSync apiId must be defined');
    }

    const apiUrl = config.aws_appsync_apiUri;

    if (!apiUrl) {
      throw new TypeError('AppSync api schema url must be defined');
    }

    if (!args.uiOut) {
      throw new TypeError('uiOut must be defined');
    }
    if (!args.modelsOut) {
      throw new TypeError('modelsOut must be defined');
    }

    const { appId, environmentName } =
      this.getAppDescription(backendIdentifier);

    this.log(`Generating code for App: ${appId}`);
    const graphqlClientGenerator = createGraphqlDocumentGenerator({ apiId });
    this.log(`Generating GraphQL Client in ${args.modelsOut}`);
    await graphqlClientGenerator.generateModels({
      language: 'typescript',
      outDir: args.modelsOut,
    });
    this.log('GraphQL client successfully generated');
    this.log(`Generating React forms in ${args.uiOut}`);
    const relativePath = path.relative(args.uiOut, args.modelsOut);
    const localFormGenerator = createFormGenerator('graphql', {
      /* eslint-disable-next-line spellcheck/spell-checker */
      appId,
      apiId,
      environmentName,
      introspectionSchemaUrl: apiUrl,
      relativePathToGraphqlModelDirectory: relativePath,
    });
    const result = await localFormGenerator.generateForms();
    await result.writeToDirectory(args.uiOut);
    this.log('React forms successfully generated');
  };

  private log = (message: unknown) => {
    /* eslint-disable-next-line no-console */
    console.log('[Codegen]\t', message);
  };

  /**
   * Translates args to BackendIdentifier.
   * Throws if translation can't be made (this should never happen if command validation works correctly).
   */
  private getBackendIdentifier = async (
    args: ArgumentsCamelCase<GenerateFormsCommandOptions>
  ): Promise<BackendIdentifier> => {
    if (args.stack) {
      return { stackName: args.stack };
    } else if (args.appId && args.branch) {
      return { backendId: args.appId, branchName: args.branch };
    } else if (args.branch) {
      return {
        appName: await this.appNameResolver.resolve(),
        branchName: args.branchName as string,
      };
    }
    throw this.missingArgsError;
  };

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
      .option('modelsOut', {
        describe: 'A path to directory where generated forms are written.',
        default: './src/graphql',
        type: 'string',
        array: false,
        group: 'Form Generation',
      })
      .option('uiOut', {
        describe: 'A path to directory where generated forms are written.',
        default: './src/ui-components',
        type: 'string',
        array: false,
        group: 'Form Generation',
      })
      .option('models', {
        describe: 'An array of model names to generate',
        type: 'string',
        array: true,
        group: 'Form Generation',
      })
      .check((argv) => {
        if (!argv.stack && !argv.branch) {
          throw this.missingArgsError;
        }
        return true;
      });
  };
}
