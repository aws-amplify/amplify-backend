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
  uiOutDir: string | undefined;
  modelsOutDir: string | undefined;
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

    await this.formGenerationHandler.generate({
      modelsOutDir: args.modelsOut,
      backendIdentifier,
      uiOutDir: args.uiOut,
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
        implies: 'appId',
      })
      .option('modelsOutDir', {
        describe: 'A path to directory where generated forms are written.',
        default: './src/graphql',
        type: 'string',
        array: false,
        group: 'Form Generation',
      })
      .option('uiOutDir', {
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
          throw new Error('Either --stack or --branch must be provided');
        }
        return true;
      });
  };
}
