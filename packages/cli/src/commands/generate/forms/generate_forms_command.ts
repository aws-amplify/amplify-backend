import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { AppNameResolver } from '../../../local_app_name_resolver.js';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import {
  BackendIdentifier,
  BackendOutputClient,
} from '@aws-amplify/deployed-backend-client';
import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { FormGenerationHandler } from './form_generation_handler.js';

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
    private readonly appNameResolver: AppNameResolver,
    private readonly credentialProvider: AwsCredentialIdentityProvider
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

    const backendOutputClient = new BackendOutputClient(
      this.credentialProvider,
      backendIdentifier
    );
    const output = await configClient.getOutput();

    const appsyncGraphqlEndpoint =
      output[graphqlOutputKey]?.payload.awsAppsyncApiEndpoint;

    if (!appsyncGraphqlEndpoint) {
      throw new TypeError('Appsync endpoint is null');
    }

    const apiId = output[graphqlOutputKey]?.payload.awsAppsyncApiId;
    if (!apiId) {
      throw new TypeError('AppSync apiId must be defined');
    }

    const apiUrl = output[graphqlOutputKey]?.payload.amplifyApiModelSchemaS3Uri;

    if (!apiUrl) {
      throw new TypeError('AppSync api schema url must be defined');
    }

    if (!args.uiOut) {
      throw new TypeError('uiOut must be defined');
    }

    if (!args.modelsOut) {
      throw new TypeError('modelsOut must be defined');
    }

    const { appId } = this.getAppDescription(backendIdentifier);
    const formGenerationHandler = new FormGenerationHandler({
      apiId,
      appId,
      modelOutPath: args.modelsOut,
      formsOutPath: args.uiOut,
      apiUrl,
    });
    await formGenerationHandler.generate();
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
