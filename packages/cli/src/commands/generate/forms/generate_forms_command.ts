import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import {
  BackendIdentifier,
  BackendOutputClient,
} from '@aws-amplify/deployed-backend-client';
import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { FormGenerationHandler } from './form_generation_handler.js';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';

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
    private readonly backendIdentifierResolver: BackendIdentifierResolver,
    private readonly backendOutputClientBuilder: (
      backendIdentifier: BackendIdentifier
    ) => BackendOutputClient,
    private readonly formGenerationHandler: FormGenerationHandler
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
    const backendIdentifier = await this.backendIdentifierResolver.resolve(
      args
    );

    const backendOutputClient =
      this.backendOutputClientBuilder(backendIdentifier);

    const output = await backendOutputClient.getOutput();

    const appsyncGraphqlEndpoint =
      output[graphqlOutputKey]?.payload.awsAppsyncApiEndpoint;

    if (!appsyncGraphqlEndpoint) {
      throw new Error('Appsync endpoint is null');
    }

    const apiId = output[graphqlOutputKey]?.payload.awsAppsyncApiId;
    if (!apiId) {
      throw new Error('AppSync apiId must be defined');
    }

    const apiUrl = output[graphqlOutputKey]?.payload.amplifyApiModelSchemaS3Uri;

    if (!apiUrl) {
      throw new Error('AppSync api schema url must be defined');
    }

    if (!args.uiOut) {
      throw new Error('uiOut must be defined');
    }

    if (!args.modelsOut) {
      throw new Error('modelsOut must be defined');
    }

    const { appId } = this.getAppDescription(backendIdentifier);
    await this.formGenerationHandler.generate({
      modelsOut: args.modelsOut,
      backendIdentifier,
      uiOut: args.uiOut,
      appId,
      apiUrl,
    });
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
