import path from 'path';
import { Argv, CommandModule } from 'yargs';
import { BackendOutputClient } from '@aws-amplify/deployed-backend-client';
import { graphqlOutputKey } from '@aws-amplify/backend-output-schemas';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { DEFAULT_UI_PATH } from '../../../form-generation/default_form_generation_output_paths.js';
import { FormGenerationHandler } from '../../../form-generation/form_generation_handler.js';
import { ArgumentsKebabCase } from '../../../kebab_case.js';
import { handleCommandFailure } from '../../../command_failure_handler.js';

export type GenerateFormsCommandOptions =
  ArgumentsKebabCase<GenerateFormsCommandOptionsCamelCase>;

type GenerateFormsCommandOptionsCamelCase = {
  stack: string | undefined;
  appId: string | undefined;
  branch: string | undefined;
  outDir: string | undefined;
  models: string[] | undefined;
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
    private readonly backendOutputClientBuilder: () => BackendOutputClient,
    private readonly formGenerationHandler: FormGenerationHandler
  ) {
    this.command = 'forms';
    this.describe = 'Generates UI forms';
  }

  getBackendIdentifier = async (args: GenerateFormsCommandOptions) => {
    return await this.backendIdentifierResolver.resolve(args);
  };

  /**
   * @inheritDoc
   */
  handler = async (args: GenerateFormsCommandOptions): Promise<void> => {
    const backendIdentifier = await this.backendIdentifierResolver.resolve(
      args
    );

    const backendOutputClient = this.backendOutputClientBuilder();

    const output = await backendOutputClient.getOutput(backendIdentifier);

    if (!(graphqlOutputKey in output) || !output[graphqlOutputKey]) {
      throw new Error('No GraphQL API configured for this backend.');
    }

    const apiUrl = output[graphqlOutputKey].payload.amplifyApiModelSchemaS3Uri;

    if (!args['out-dir']) {
      throw new Error('out-dir must be defined');
    }

    const outDir = args['out-dir'];

    await this.formGenerationHandler.generate({
      modelsOutDir: path.join(outDir, 'graphql'),
      backendIdentifier,
      uiOutDir: outDir,
      apiUrl,
      modelsFilter: args.models,
    });
  };

  /**
   * @inheritDoc
   */
  builder = (yargs: Argv): Argv<GenerateFormsCommandOptions> => {
    return yargs
      .option('stack', {
        conflicts: ['app-id', 'branch'],
        describe: 'A stack name that contains an Amplify backend',
        type: 'string',
        array: false,
        group: 'Stack identifier',
      })
      .option('app-id', {
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
      .option('out-dir', {
        describe: 'A path to directory where generated forms are written.',
        default: DEFAULT_UI_PATH,
        type: 'string',
        array: false,
        group: 'Form Generation',
      })
      .option('models', {
        describe: 'Model name to generate',
        type: 'string',
        array: true,
        group: 'Form Generation',
      })
      .fail((msg, err) => {
        handleCommandFailure(msg, err, yargs);
        yargs.exit(1, err);
      });
  };
}
